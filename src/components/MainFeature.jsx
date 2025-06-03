import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
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
  
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  // Load backgrounds on component mount
  useEffect(() => {
    const loadBackgrounds = async () => {
      setLoading(true)
      try {
        const result = await backgroundService.getAll()
        setBackgrounds(result || [])
      } catch (err) {
        setError(err.message)
        toast.error("Failed to load backgrounds")
      } finally {
        setLoading(false)
      }
    }
    loadBackgrounds()
  }, [])

  // Handle file upload
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

  // Filter backgrounds
  const filteredBackgrounds = backgrounds?.filter(bg => {
    const matchesCategory = activeCategory === 'all' || bg.category === activeCategory
    const matchesSearch = bg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bg.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  }) || []

  // Get unique categories
  const categories = ['all', ...new Set(backgrounds?.map(bg => bg.category) || [])]

  // Handle background selection
  const handleBackgroundSelect = async (background) => {
    try {
      setSelectedBackground(background)
      toast.success(`Background "${background.name}" selected!`)
    } catch (err) {
      toast.error("Failed to select background")
    }
  }

// Handle adjustment changes
  const handleAdjustmentChange = (key, value) => {
    setAdjustments(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Handle text setting changes
  const handleTextSettingChange = (key, value) => {
    setTextSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Generate composite and download
  const handleDownload = async () => {
    if (!uploadedImage || !selectedBackground) {
      toast.error("Please upload an image and select a background first")
      return
    }

    setIsProcessing(true)
    try {
      const compositeData = {
        foregroundImage: uploadedImage,
        background: selectedBackground,
        adjustments: adjustments,
        createdAt: new Date().toISOString()
      }
      
      const savedComposite = await compositeImageService.create(compositeData)
      
      // Create download link
      const link = document.createElement('a')
      link.download = `backdropify-${Date.now()}.png`
      link.href = uploadedImage.url // In a real app, this would be the composite image
      link.click()
      
      toast.success("Image downloaded successfully!")
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
              <span>Add Text</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Your Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want behind your image..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 resize-none"
                />
              </div>
            </div>
          </div>

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
              {/* Background Text */}
              {text && (
                <div 
                  className="absolute inset-0 flex items-center justify-center text-center font-bold leading-tight"
                  style={{
                    fontSize: `${textSettings.size}px`,
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
              
              {/* Foreground Image */}
              {uploadedImage && (
                <img
                  src={uploadedImage.url}
                  alt="Foreground"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    zIndex: 2
                  }}
                />
              )}
              
              {!uploadedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-surface-400">
                    <ApperIcon name="ImageIcon" className="w-16 h-16 mx-auto mb-3" />
                    <p className="text-lg font-medium">Preview Area</p>
                    <p className="text-sm">Upload an image and add text</p>
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