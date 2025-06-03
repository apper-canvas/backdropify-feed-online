import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import { fabric } from 'fabric'
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Rect, Group } from 'react-konva'
import useImage from 'use-image'
import ApperIcon from './ApperIcon'
import imageService from '../services/api/imageService'

const MainFeature = () => {
  // Core state management
  const [uploadedImage, setUploadedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // AI/Object Detection state
  const [cocoModel, setCocoModel] = useState(null)
  const [detectedObjects, setDetectedObjects] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionConfidence, setDetectionConfidence] = useState(0.6)
  const [enableObjectDetection, setEnableObjectDetection] = useState(true)
  
  // Canvas and layer management state
  const [fabricCanvas, setFabricCanvas] = useState(null)
  const [canvasLayers, setCanvasLayers] = useState([])
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [textElements, setTextElements] = useState([])
  const [canvasObjects, setCanvasObjects] = useState([])
  
  // Text settings state
  const [textInput, setTextInput] = useState('')
  const [textSettings, setTextSettings] = useState({
    fontSize: 48,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fill: '#000000',
    opacity: 0.8,
    textAlign: 'center',
    stroke: '',
    strokeWidth: 0,
    shadow: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowOffsetX: 5,
    shadowOffsetY: 5
  })
  
  // Canvas dimensions and scaling
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 600 })
  const [imageScale, setImageScale] = useState(1)
  
  // Refs
  const fileInputRef = useRef(null)
  const fabricCanvasRef = useRef(null)
  const stageRef = useRef(null)
  const downloadCanvasRef = useRef(null)

  // Load TensorFlow model on mount
  useEffect(() => {
    const loadModel = async () => {
      setLoading(true)
      try {
        await tf.ready()
        const model = await cocoSsd.load()
        setCocoModel(model)
        toast.success("AI model loaded successfully!")
      } catch (err) {
        setError(err.message)
        toast.error("Failed to load AI model")
      } finally {
        setLoading(false)
      }
    }
    loadModel()
  }, [])

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (fabricCanvasRef.current && !fabricCanvas) {
      const canvas = new fabric.Canvas(fabricCanvasRef.current, {
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        backgroundColor: '#f8f9fa',
        selection: true,
        preserveObjectStacking: true
      })

      // Set up canvas event handlers
      canvas.on('selection:created', (e) => {
        setSelectedLayer(e.target)
      })

      canvas.on('selection:updated', (e) => {
        setSelectedLayer(e.target)
      })

      canvas.on('selection:cleared', () => {
        setSelectedLayer(null)
      })

      canvas.on('object:modified', () => {
        updateLayerList()
      })

      setFabricCanvas(canvas)

      return () => {
        canvas.dispose()
      }
    }
  }, [canvasDimensions, fabricCanvas])

  // Update layer list from canvas objects
  const updateLayerList = () => {
    if (fabricCanvas) {
      const objects = fabricCanvas.getObjects()
      setCanvasLayers(objects.map((obj, index) => ({
        id: obj.id || `layer-${index}`,
        type: obj.type,
        name: obj.name || `${obj.type} ${index + 1}`,
        visible: obj.visible !== false,
        zIndex: index,
        object: obj
      })))
    }
  }

  // Handle file upload with enhanced object detection
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
          
          // Calculate canvas dimensions and scaling
          const maxCanvasSize = 600
          const scale = Math.min(maxCanvasSize / img.width, maxCanvasSize / img.height, 1)
          const canvasWidth = img.width * scale
          const canvasHeight = img.height * scale
          
          setCanvasDimensions({ width: canvasWidth, height: canvasHeight })
          setImageScale(scale)
          
          // Add image to Fabric.js canvas
          if (fabricCanvas) {
            fabricCanvas.setDimensions({ width: canvasWidth, height: canvasHeight })
            
            fabric.Image.fromURL(e.target.result, (fabricImg) => {
              fabricImg.set({
                left: 0,
                top: 0,
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                name: 'background-image',
                id: 'bg-image'
              })
              
              fabricCanvas.add(fabricImg)
              fabricCanvas.sendToBack(fabricImg)
              fabricCanvas.renderAll()
              updateLayerList()
            })
          }
          
          // Perform object detection
          if (enableObjectDetection && cocoModel) {
            await detectObjectsOnCanvas(img)
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

  // Enhanced object detection with canvas integration
  const detectObjectsOnCanvas = async (imageElement) => {
    if (!cocoModel || !fabricCanvas) return
    
    setIsDetecting(true)
    try {
      const predictions = await cocoModel.detect(imageElement)
      const filteredPredictions = predictions.filter(
        prediction => prediction.score >= detectionConfidence
      )
      
      setDetectedObjects(filteredPredictions)
      
      // Remove existing object detection rectangles
      const existingDetections = fabricCanvas.getObjects().filter(obj => obj.name === 'detection-box')
      existingDetections.forEach(obj => fabricCanvas.remove(obj))
      
      // Add detection rectangles to canvas
      filteredPredictions.forEach((prediction, index) => {
        const [x, y, width, height] = prediction.bbox
        
        const rect = new fabric.Rect({
          left: x * imageScale,
          top: y * imageScale,
          width: width * imageScale,
          height: height * imageScale,
          fill: 'transparent',
          stroke: '#6366f1',
          strokeWidth: 3,
          strokeDashArray: [10, 5],
          selectable: true,
          name: 'detection-box',
          id: `detection-${index}`,
          objectClass: prediction.class,
          confidence: prediction.score
        })

        // Add label
        const label = new fabric.Text(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, {
          left: x * imageScale,
          top: (y * imageScale) - 25,
          fontSize: 14,
          fill: '#6366f1',
          backgroundColor: 'rgba(255,255,255,0.8)',
          selectable: false,
          name: 'detection-label',
          id: `label-${index}`
        })

        fabricCanvas.add(rect)
        fabricCanvas.add(label)
      })
      
      fabricCanvas.renderAll()
      updateLayerList()
      
      toast.success(`Detected ${filteredPredictions.length} objects`)
    } catch (err) {
      toast.error("Object detection failed")
      console.error(err)
    } finally {
      setIsDetecting(false)
    }
  }

  // Add text behind selected object
  const addTextBehindObject = () => {
    if (!textInput.trim() || !fabricCanvas) {
      toast.error("Please enter text to add")
      return
    }

    const selectedObj = selectedLayer
    if (!selectedObj || selectedObj.name !== 'detection-box') {
      toast.error("Please select a detected object first")
      return
    }

    // Calculate text position (center of selected object)
    const textX = selectedObj.left + (selectedObj.width * selectedObj.scaleX) / 2
    const textY = selectedObj.top + (selectedObj.height * selectedObj.scaleY) / 2

    const textObj = new fabric.Text(textInput, {
      left: textX,
      top: textY,
      fontSize: textSettings.fontSize,
      fontFamily: textSettings.fontFamily,
      fontWeight: textSettings.fontWeight,
      fill: textSettings.fill,
      opacity: textSettings.opacity,
      textAlign: textSettings.textAlign,
      stroke: textSettings.stroke,
      strokeWidth: textSettings.strokeWidth,
      originX: 'center',
      originY: 'center',
      selectable: true,
      name: 'text-element',
      id: `text-${Date.now()}`,
      behindObject: selectedObj.id
    })

    // Add shadow if enabled
    if (textSettings.shadow) {
      textObj.set({
        shadow: {
          color: textSettings.shadowColor,
          blur: textSettings.shadowBlur,
          offsetX: textSettings.shadowOffsetX,
          offsetY: textSettings.shadowOffsetY
        }
      })
    }

    fabricCanvas.add(textObj)
    
    // Move text behind the selected object
    const objIndex = fabricCanvas.getObjects().indexOf(selectedObj)
    const textIndex = fabricCanvas.getObjects().indexOf(textObj)
    
    if (objIndex > 0) {
      fabricCanvas.moveTo(textObj, objIndex)
    }
    
    fabricCanvas.renderAll()
    updateLayerList()
    
    const newTextElement = {
      id: textObj.id,
      text: textInput,
      settings: { ...textSettings },
      behindObject: selectedObj.objectClass,
      object: textObj
    }
    
    setTextElements(prev => [...prev, newTextElement])
    setTextInput('')
    
    toast.success(`Text added behind ${selectedObj.objectClass}`)
  }

  // Update text settings for selected text
  const updateTextSettings = (key, value) => {
    setTextSettings(prev => ({ ...prev, [key]: value }))
    
    if (selectedLayer && selectedLayer.type === 'text') {
      selectedLayer.set({ [key]: value })
      
      if (key === 'shadow' && value) {
        selectedLayer.set({
          shadow: {
            color: textSettings.shadowColor,
            blur: textSettings.shadowBlur,
            offsetX: textSettings.shadowOffsetX,
            offsetY: textSettings.shadowOffsetY
          }
        })
      } else if (key === 'shadow' && !value) {
        selectedLayer.set({ shadow: null })
      }
      
      fabricCanvas.renderAll()
      updateLayerList()
    }
  }

  // Layer management functions
  const moveLayerUp = (layerId) => {
    if (!fabricCanvas) return
    
    const obj = fabricCanvas.getObjects().find(o => o.id === layerId)
    if (obj) {
      fabricCanvas.bringForward(obj)
      updateLayerList()
      toast.success("Layer moved up")
    }
  }

  const moveLayerDown = (layerId) => {
    if (!fabricCanvas) return
    
    const obj = fabricCanvas.getObjects().find(o => o.id === layerId)
    if (obj) {
      fabricCanvas.sendBackwards(obj)
      updateLayerList()
      toast.success("Layer moved down")
    }
  }

  const toggleLayerVisibility = (layerId) => {
    if (!fabricCanvas) return
    
    const obj = fabricCanvas.getObjects().find(o => o.id === layerId)
    if (obj) {
      obj.set('visible', !obj.visible)
      fabricCanvas.renderAll()
      updateLayerList()
    }
  }

  const deleteLayer = (layerId) => {
    if (!fabricCanvas) return
    
    const obj = fabricCanvas.getObjects().find(o => o.id === layerId)
    if (obj) {
      fabricCanvas.remove(obj)
      fabricCanvas.renderAll()
      updateLayerList()
      
      // Remove from text elements if it's a text
      setTextElements(prev => prev.filter(el => el.id !== layerId))
      
      toast.success("Layer deleted")
    }
  }

  // Re-run object detection with new confidence
  const handleDetectionConfidenceChange = async (newConfidence) => {
    setDetectionConfidence(newConfidence)
    if (uploadedImage && enableObjectDetection && cocoModel) {
      const img = new window.Image()
      img.onload = () => detectObjectsOnCanvas(img)
      img.src = uploadedImage.url
    }
  }

  // Export canvas as image
  const handleDownload = async () => {
    if (!fabricCanvas || !uploadedImage) {
      toast.error("Please upload an image first")
      return
    }

    setIsProcessing(true)
    try {
      // Create high-quality export
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 2 // Higher resolution
      })
      
      const link = document.createElement('a')
      link.download = `text-behind-objects-${Date.now()}.png`
      link.href = dataURL
      link.click()
      
      toast.success("Image downloaded successfully!")
    } catch (err) {
      toast.error("Failed to download image")
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Reset everything
  const handleReset = () => {
    if (fabricCanvas) {
      fabricCanvas.clear()
      fabricCanvas.setBackgroundColor('#f8f9fa', fabricCanvas.renderAll.bind(fabricCanvas))
    }
    
    setUploadedImage(null)
    setDetectedObjects([])
    setTextElements([])
    setCanvasLayers([])
    setSelectedLayer(null)
    setTextInput('')
    setTextSettings({
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      opacity: 0.8,
      textAlign: 'center',
      stroke: '',
      strokeWidth: 0,
      shadow: false,
      shadowColor: '#000000',
      shadowBlur: 10,
      shadowOffsetX: 5,
      shadowOffsetY: 5
    })
    
    toast.success("Editor reset successfully")
  }

  // Drag and drop handlers
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

  return (
    <div className="w-full max-w-7xl mx-auto">
      <motion.div 
        className="grid grid-cols-1 xl:grid-cols-12 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Left Panel - Upload & Controls */}
        <motion.div 
          className="xl:col-span-4 space-y-6"
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

          {/* Object Detection Controls */}
          {cocoModel && (
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
                    Enable Detection
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
                      Confidence Threshold
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
                    <div className="space-y-2 max-h-32 overflow-y-auto">
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

          {/* Text Input & Controls */}
          <motion.div 
            className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <ApperIcon name="Type" className="w-5 h-5 text-primary-500" />
              <span>Add Text Behind Objects</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Text Content
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text to place behind detected objects..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 resize-none"
                />
              </div>

              <button
                onClick={addTextBehindObject}
                disabled={!textInput.trim() || !selectedLayer || selectedLayer.name !== 'detection-box'}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <ApperIcon name="Plus" className="w-4 h-4" />
                <span>Add Text Behind Selected Object</span>
              </button>

              {selectedLayer && selectedLayer.name !== 'detection-box' && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Select a detected object (blue box) to add text behind it
{selectedLayer && selectedLayer.name !== 'detection-box' && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Select a detected object (blue box) to add text behind it
                </p>
              )}
            </div>
          </motion.div>
              className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <ApperIcon name="Settings" className="w-5 h-5 text-primary-500" />
                <span>Text Styling</span>
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Font Size: {textSettings.fontSize}px
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={120}
                      value={textSettings.fontSize}
                      onChange={(e) => updateTextSettings('fontSize', parseInt(e.target.value))}
                      className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Opacity: {Math.round(textSettings.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={textSettings.opacity}
                      onChange={(e) => updateTextSettings('opacity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Font Family
                    </label>
                    <select
                      value={textSettings.fontFamily}
                      onChange={(e) => updateTextSettings('fontFamily', e.target.value)}
                      className="w-full px-3 py-2 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Comic Sans MS">Comic Sans MS</option>
                      <option value="Impact">Impact</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Font Weight
                    </label>
                    <select
                      value={textSettings.fontWeight}
                      onChange={(e) => updateTextSettings('fontWeight', e.target.value)}
                      className="w-full px-3 py-2 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="lighter">Lighter</option>
                      <option value="bolder">Bolder</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={textSettings.fill}
                      onChange={(e) => updateTextSettings('fill', e.target.value)}
                      className="w-full h-10 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Text Alignment
                    </label>
                    <select
                      value={textSettings.textAlign}
                      onChange={(e) => updateTextSettings('textAlign', e.target.value)}
                      className="w-full px-3 py-2 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      Text Shadow
                    </label>
                    <button
                      onClick={() => updateTextSettings('shadow', !textSettings.shadow)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        textSettings.shadow ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        textSettings.shadow ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {textSettings.shadow && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <input
                        type="color"
                        value={textSettings.shadowColor}
                        onChange={(e) => updateTextSettings('shadowColor', e.target.value)}
                        className="w-full h-8 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded cursor-pointer"
                        title="Shadow Color"
                      />
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={textSettings.shadowBlur}
                        onChange={(e) => updateTextSettings('shadowBlur', parseInt(e.target.value))}
                        className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer"
                        title="Shadow Blur"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Center Panel - Canvas Editor */}
        <motion.div 
          className="xl:col-span-5"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <ApperIcon name="Palette" className="w-5 h-5 text-primary-500" />
              <span>Interactive Canvas Editor</span>
            </h3>
            
            <div className="relative">
              <div className="border-2 border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-surface-50 dark:bg-surface-900">
                {uploadedImage ? (
                  <canvas
                    ref={fabricCanvasRef}
                    className="w-full max-w-full"
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-surface-400">
                    <div className="text-center">
                      <ApperIcon name="ImageIcon" className="w-16 h-16 mx-auto mb-3" />
                      <p className="text-lg font-medium">Advanced Canvas Editor</p>
                      <p className="text-sm">Upload an image to start editing with AI-powered object detection</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Canvas Controls */}
              {uploadedImage && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={isProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:shadow-soft transition-all duration-300 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <ApperIcon name="Loader2" className="w-4 h-4 animate-spin" />
                    ) : (
                      <ApperIcon name="Download" className="w-4 h-4" />
                    )}
                    <span>Export</span>
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="flex items-center space-x-2 px-4 py-2 bg-surface-200 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg font-medium hover:bg-surface-300 dark:hover:bg-surface-600 transition-all duration-300"
                  >
                    <ApperIcon name="RotateCcw" className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Panel - Layer Management */}
        <motion.div 
          className="xl:col-span-3 space-y-6"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* Layer Management */}
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <ApperIcon name="Layers" className="w-5 h-5 text-primary-500" />
              <span>Layers</span>
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {canvasLayers.length > 0 ? (
                canvasLayers.slice().reverse().map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedLayer?.id === layer.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500'
                    }`}
                    onClick={() => {
                      if (fabricCanvas) {
                        fabricCanvas.setActiveObject(layer.object)
                        fabricCanvas.renderAll()
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLayerVisibility(layer.id)
                            }}
                            className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded"
                          >
                            <ApperIcon 
                              name={layer.visible ? "Eye" : "EyeOff"} 
                              className="w-4 h-4 text-surface-500" 
                            />
                          </button>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {layer.name}
                          </p>
                          <p className="text-xs text-surface-500 capitalize">
                            {layer.type}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerUp(layer.id)
                          }}
                          className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded"
                          title="Move Up"
                        >
                          <ApperIcon name="ChevronUp" className="w-4 h-4 text-surface-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerDown(layer.id)
                          }}
                          className="p-1 hover:bg-surface-200 dark:hover:bg-surface-600 rounded"
                          title="Move Down"
                        >
                          <ApperIcon name="ChevronDown" className="w-4 h-4 text-surface-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteLayer(layer.id)
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                          title="Delete"
                        >
                          <ApperIcon name="Trash2" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-surface-400">
                  <ApperIcon name="Layers" className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">No layers yet</p>
                  <p className="text-xs">Upload an image to start</p>
                </div>
              )}
            </div>
          </div>

          {/* Text Elements List */}
          {textElements.length > 0 && (
            <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-card border border-surface-200/50 dark:border-surface-700/50">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <ApperIcon name="Type" className="w-5 h-5 text-primary-500" />
                <span>Text Elements</span>
              </h3>
              
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {textElements.map((element) => (
                  <div
                    key={element.id}
                    className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                          "{element.text}"
                        </p>
                        <p className="text-xs text-surface-500">
                          Behind: {element.behindObject}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteLayer(element.id)}
                        className="ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                        title="Delete Text"
                      >
                        <ApperIcon name="X" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default MainFeature