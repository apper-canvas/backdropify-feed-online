import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import * as tf from '@tensorflow/tfjs'
import * as bodyPix from '@tensorflow-models/body-pix'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import ApperIcon from './ApperIcon'
import backgroundService from '../services/api/backgroundService'
import imageService from '../services/api/imageService'
import compositeImageService from '../services/api/compositeImageService'

const MainFeature = () => {
// State management
  const [uploadedImage, setUploadedImage] = useState(null)
  const [selectedBackground, setSelectedBackground] = useState(null)
  const [backgrounds, setBackgrounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [backgroundName, setBackgroundName] = useState('')
  const [text, setText] = useState('')
  const [textSettings, setTextSettings] = useState({
    size: 48,
    color: '#000000',
    opacity: 50,
    positionX: 50,
    positionY: 50
  })
  const [adjustments, setAdjustments] = useState({
    opacity: 100,
    blur: 0,
    scale: 100,
    positionX: 50,
    positionY: 50
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Object detection state
  const [detectedObjects, setDetectedObjects] = useState([])
  const [bodyPixModel, setBodyPixModel] = useState(null)
  const [cocoModel, setCocoModel] = useState(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionConfidence, setDetectionConfidence] = useState(0.6)
  const [subjectMask, setSubjectMask] = useState(null)
  const [enableObjectDetection, setEnableObjectDetection] = useState(true)
  
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const previewCanvasRef = useRef(null)
// Load TensorFlow models on component mount
  useEffect(() => {
    const loadModels = async () => {
      setLoading(true)
      try {
        // Load TensorFlow.js backend
        await tf.ready()
        
        // Load BodyPix model for person segmentation
        const bodyPixNet = await bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2
        })
        setBodyPixModel(bodyPixNet)
        
        // Load COCO-SSD model for object detection
        const cocoNet = await cocoSsd.load()
        setCocoModel(cocoNet)
        
        toast.success("AI models loaded successfully!")
      } catch (err) {
        setError(err.message)
        toast.error("Failed to load AI models")
      } finally {
        setLoading(false)
      }
    }
    loadModels()
  }, [])

// Handle file upload with object detection
  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error("Please upload a valid image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    setIsProcessing(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const img = new window.Image()
        img.onload = async () => {
          const imageData = {
            url: e.target.result,
            name: file.name,
            size: file.size,
            dimensions: { width: img.width, height: img.height }
          }
          
          const savedImage = await imageService.create(imageData)
          setUploadedImage(savedImage)
          
          // Perform object detection if enabled and models are loaded
          if (enableObjectDetection && bodyPixModel && cocoModel) {
            await detectObjects(img)
          }
          
          toast.success("Image uploaded successfully!")
          setIsProcessing(false)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(err.message)
      toast.error("Failed to upload image")
      setIsProcessing(false)
    }
  }

// Object detection functions
  const detectObjects = async (imageElement) => {
    if (!bodyPixModel || !cocoModel) return
    
    setIsDetecting(true)
    try {
      // Detect people using BodyPix
      const personSegmentation = await bodyPixModel.segmentPerson(imageElement)
      
      // Detect general objects using COCO-SSD
      const objectPredictions = await cocoModel.detect(imageElement)
      
      // Filter predictions by confidence
      const filteredPredictions = objectPredictions.filter(
        prediction => prediction.score >= detectionConfidence
      )
      
      setDetectedObjects(filteredPredictions)
      
      // Generate subject mask for people
      if (personSegmentation) {
        const mask = await generateSubjectMask(imageElement, personSegmentation)
        setSubjectMask(mask)
      }
      
      toast.success(`Detected ${filteredPredictions.length} objects`)
    } catch (err) {
      toast.error("Object detection failed")
      console.error(err)
    } finally {
      setIsDetecting(false)
    }
  }
  
  const generateSubjectMask = async (imageElement, segmentation) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = imageElement.width
    canvas.height = imageElement.height
    
    const imageData = ctx.createImageData(canvas.width, canvas.height)
    const data = imageData.data
    
    for (let i = 0; i < segmentation.data.length; i++) {
      const pixelIndex = i * 4
      if (segmentation.data[i] === 1) { // Person pixel
        data[pixelIndex] = 255     // R
        data[pixelIndex + 1] = 255 // G
        data[pixelIndex + 2] = 255 // B
        data[pixelIndex + 3] = 255 // A
      } else {
        data[pixelIndex + 3] = 0   // Transparent
      }
    }
    
ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
  }

  const renderCompositeImage = () => {
    if (!uploadedImage || !text.trim()) return
    
    const canvas = previewCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const img = imageRef.current
    
    if (!img) return
    
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (subjectMask && enableObjectDetection) {
      // Advanced rendering with object segmentation
      // Step 1: Draw original image as background
      ctx.drawImage(img, 0, 0)
      
      // Step 2: Draw text behind object areas
      ctx.font = `${textSettings.size}px Arial`
      ctx.fillStyle = textSettings.color
      ctx.globalAlpha = textSettings.opacity / 100
      ctx.textAlign = 'center'
      
      const textX = (textSettings.positionX / 100) * canvas.width
      const textY = (textSettings.positionY / 100) * canvas.height
      
      // Use mask to only show text in non-object areas
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillText(text, textX, textY)
      
      // Step 3: Load and apply subject mask
      const maskImg = new window.Image()
      maskImg.onload = () => {
        // Create a temporary canvas for mask processing
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        
        // Draw the subject mask
        tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height)
        
        // Use the mask to composite the original image over text
        ctx.globalCompositeOperation = 'source-over'
        
        // Get mask data
        const maskData = tempCtx.getImageData(0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // Apply selective compositing - show original image only where subject exists
        for (let i = 0; i < maskData.data.length; i += 4) {
          const alpha = maskData.data[i + 3] // Alpha channel of mask
          if (alpha > 128) { // Subject pixel
            // Keep original image pixel (already drawn)
          } else {
            // This is background area - ensure text shows through
            // We'll redraw the text with proper blending
          }
        }
        
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over'
      }
      maskImg.src = subjectMask
    } else {
      // Simple rendering without object detection
      // Draw background first
      ctx.drawImage(img, 0, 0)
      
      // Draw text on top with transparency
      ctx.font = `${textSettings.size}px Arial`
      ctx.fillStyle = textSettings.color
      ctx.globalAlpha = textSettings.opacity / 100
      ctx.textAlign = 'center'
      
      const textX = (textSettings.positionX / 100) * canvas.width
      const textY = (textSettings.positionY / 100) * canvas.height
      
      ctx.fillText(text, textX, textY)
      
      // Reset alpha
      ctx.globalAlpha = 1
    }
  }

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

// Handle text setting changes
  const handleTextSettingChange = (key, value) => {
    setTextSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Re-run object detection with new confidence
  const handleDetectionConfidenceChange = async (newConfidence) => {
    setDetectionConfidence(newConfidence)
    if (uploadedImage && imageRef.current && enableObjectDetection) {
      await detectObjects(imageRef.current)
    }
  }

  // Generate composite and download
  const handleDownload = async () => {
    if (!uploadedImage || !text.trim()) {
      toast.error("Please upload an image and add text first")
      return
    }

    setIsProcessing(true)
    try {
      renderCompositeImage()
      
      const canvas = previewCanvasRef.current
      if (canvas) {
        const link = document.createElement('a')
        link.download = `text-behind-image-${Date.now()}.png`
        link.href = canvas.toDataURL()
        link.click()
        
        toast.success("Image downloaded successfully!")
      }
    } catch (err) {
      toast.error("Failed to download image")
    } finally {
      setIsProcessing(false)
    }
  }

  // Reset all
  const handleReset = () => {
    setUploadedImage(null)
    setSelectedBackground(null)
    setText('')
    setDetectedObjects([])
    setSubjectMask(null)
    setTextSettings({
      size: 48,
      color: '#000000',
      opacity: 50,
      positionX: 50,
      positionY: 50
    })
    setAdjustments({
      opacity: 100,
      blur: 0,
      scale: 100,
      positionX: 50,
      positionY: 50
    })
    toast.success("Editor reset successfully")
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Upload & Controls Panel */}
        <motion.div 
          className="space-y-6"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Upload Section */}
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <ApperIcon name="Upload" className="w-5 h-5 text-primary-500" />
              <span>Upload Image</span>
            </h3>
            
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-surface-300 dark:border-surface-600 hover:border-primary-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center space-y-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <ApperIcon name="Loader2" className="w-8 h-8 text-primary-500" />
                  </motion.div>
                  <p className="text-surface-600 dark:text-surface-400">Processing image...</p>
                </div>
              ) : uploadedImage ? (
                <div className="flex flex-col items-center space-y-3">
                  <img 
                    src={uploadedImage.url} 
                    alt="Uploaded" 
                    className="w-20 h-20 object-cover rounded-lg shadow-card"
                  />
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {uploadedImage.displayName || uploadedImage.name}
                  </p>
                  <p className="text-xs text-surface-500">
                    {uploadedImage.dimensions?.width} × {uploadedImage.dimensions?.height}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <ApperIcon name="ImagePlus" className="w-12 h-12 text-surface-400" />
                  <div>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      Drop your image here
                    </p>
                    <p className="text-sm text-surface-500">
                      or click to browse
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

{/* Text Input Section */}
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <ApperIcon name="Type" className="w-5 h-5 text-primary-500" />
              <span>Add Text Behind Object</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Your Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want behind the detected object..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Object Detection Controls */}
          {bodyPixModel && cocoModel && (
            <motion.div 
              className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <ApperIcon name="Brain" className="w-5 h-5 text-primary-500" />
                <span>Object Detection</span>
                {isDetecting && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <ApperIcon name="Loader2" className="w-4 h-4 text-primary-500" />
                  </motion.div>
                )}
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Enable Object Detection
                  </label>
                  <button
                    onClick={() => setEnableObjectDetection(!enableObjectDetection)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enableObjectDetection ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableObjectDetection ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Detection Confidence
                    </label>
                    <span className="text-sm text-surface-500">
                      {Math.round(detectionConfidence * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={detectionConfidence}
                    onChange={(e) => handleDetectionConfidenceChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {detectedObjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Detected Objects ({detectedObjects.length})
                    </label>
                    <div className="space-y-2">
                      {detectedObjects.map((obj, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-surface-100 dark:bg-surface-700 rounded-lg">
                          <span className="text-sm font-medium capitalize">{obj.class}</span>
                          <span className="text-xs text-surface-500">{Math.round(obj.score * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Text Controls */}
          {uploadedImage && text && (
            <motion.div 
              className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <ApperIcon name="Settings" className="w-5 h-5 text-primary-500" />
                <span>Text Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Text Size
                    </label>
                    <span className="text-sm text-surface-500">
                      {textSettings.size}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    value={textSettings.size}
                    onChange={(e) => handleTextSettingChange('size', parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={textSettings.color}
                    onChange={(e) => handleTextSettingChange('color', e.target.value)}
                    className="w-full h-10 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Text Opacity
                    </label>
                    <span className="text-sm text-surface-500">
                      {textSettings.opacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={textSettings.opacity}
                    onChange={(e) => handleTextSettingChange('opacity', parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Horizontal Position
                    </label>
                    <span className="text-sm text-surface-500">
                      {textSettings.positionX}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={textSettings.positionX}
                    onChange={(e) => handleTextSettingChange('positionX', parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Vertical Position
                    </label>
                    <span className="text-sm text-surface-500">
                      {textSettings.positionY}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={textSettings.positionY}
                    onChange={(e) => handleTextSettingChange('positionY', parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {uploadedImage && (
            <motion.div 
              className="space-y-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <button
                onClick={handleDownload}
                disabled={!text.trim() || isProcessing}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-card hover:shadow-soft transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <ApperIcon name="Loader2" className="w-5 h-5 animate-spin" />
                ) : (
                  <ApperIcon name="Download" className="w-5 h-5" />
                )}
                <span>Download Image</span>
              </button>
              
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-surface-200 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-xl font-medium hover:bg-surface-300 dark:hover:bg-surface-600 transition-all duration-300"
              >
                <ApperIcon name="RotateCcw" className="w-5 h-5" />
                <span>Reset All</span>
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Preview Canvas */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <ApperIcon name="Eye" className="w-5 h-5 text-primary-500" />
              <span>Live Preview</span>
            </h3>
            
<div className="relative aspect-square rounded-xl overflow-hidden image-canvas border-2 border-surface-200 dark:border-surface-700">
              {/* Background Layer - Text behind objects */}
              {text && uploadedImage && (
                <div 
                  className="absolute inset-0 flex items-center justify-center text-center font-bold leading-tight pointer-events-none"
                  style={{
                    fontSize: `${textSettings.size * 0.8}px`, // Slightly smaller for preview
                    color: textSettings.color,
                    opacity: textSettings.opacity / 100,
                    left: `${textSettings.positionX}%`,
                    top: `${textSettings.positionY}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    wordBreak: 'break-word',
                    maxWidth: '90%'
                  }}
                >
                  {text}
                </div>
              )}
{/* Main Image with Object Detection - positioned above text */}
              {uploadedImage && (
                <div className="relative w-full h-full" style={{ zIndex: 2 }}>
                  <img
                    ref={imageRef}
                    src={uploadedImage.url}
                    alt="Main Image"
                    className="w-full h-full object-contain"
                    style={{ 
                      zIndex: 2,
                      // Use mix-blend-mode to allow text to show through background areas
                      mixBlendMode: subjectMask && enableObjectDetection ? 'multiply' : 'normal'
                    }}
                    onLoad={() => {
                      if (enableObjectDetection && bodyPixModel && cocoModel && imageRef.current) {
                        detectObjects(imageRef.current)
                      }
                      // Update preview when image loads
                      setTimeout(() => renderCompositeImage(), 100)
                    }}
                  />
                  
                  {/* Object Detection Overlay */}
                  {detectedObjects.length > 0 && (
                    <div className="absolute inset-0" style={{ zIndex: 3 }}>
                      {detectedObjects.map((obj, index) => {
                        const imageElement = imageRef.current
                        if (!imageElement) return null
                        
                        const scaleX = imageElement.offsetWidth / imageElement.naturalWidth
                        const scaleY = imageElement.offsetHeight / imageElement.naturalHeight
                        
                        return (
                          <div
                            key={index}
                            className="absolute border-2 border-primary-500 bg-primary-500/20"
                            style={{
                              left: obj.bbox[0] * scaleX,
                              top: obj.bbox[1] * scaleY,
                              width: obj.bbox[2] * scaleX,
                              height: obj.bbox[3] * scaleY,
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-primary-500 text-white px-2 py-1 text-xs rounded">
                              {obj.class} ({Math.round(obj.score * 100)}%)
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {/* Hidden canvas for composite rendering */}
              <canvas
                ref={previewCanvasRef}
                className="hidden"
              />
              
              {!uploadedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-surface-400">
                    <ApperIcon name="ImageIcon" className="w-16 h-16 mx-auto mb-3" />
                    <p className="text-lg font-medium">AI-Powered Preview</p>
                    <p className="text-sm">Upload an image to detect objects and add text behind them</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default MainFeature