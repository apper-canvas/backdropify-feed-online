import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import MainFeature from '../components/MainFeature'
import ApperIcon from '../components/ApperIcon'

const Home = () => {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        className="relative z-10 backdrop-blur-xl bg-white/80 dark:bg-surface-900/80 border-b border-surface-200/50 dark:border-surface-700/50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-card">
                <ApperIcon name="Image" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  BackDropify
                </h1>
                <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 hidden sm:block">
                  Professional Background Editor
                </p>
              </div>
            </motion.div>

            <motion.button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 sm:p-3 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all duration-300 shadow-card hover:shadow-soft"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ApperIcon 
                name={darkMode ? "Sun" : "Moon"} 
                className="w-5 h-5 sm:w-6 sm:h-6 text-surface-700 dark:text-surface-300" 
              />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="relative py-12 sm:py-16 lg:py-20 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-secondary-500/10" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h2 
              className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-600 bg-clip-text text-transparent leading-tight"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Transform Your Images with
              <span className="block text-transparent bg-gradient-to-r from-secondary-500 to-primary-500 bg-clip-text">
                Professional Backgrounds
              </span>
            </motion.h2>
            
            <motion.p 
              className="text-lg sm:text-xl text-surface-600 dark:text-surface-400 mb-8 sm:mb-12 leading-relaxed px-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Upload your images and seamlessly blend them with stunning backgrounds. 
              Create professional compositions in seconds with our intuitive editor.
            </motion.p>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
{[
                { icon: "Upload", title: "Easy Upload", desc: "Drag & drop your images instantly" },
                { icon: "Type", title: "Custom Text", desc: "Add any text behind your images" },
                { icon: "Download", title: "Export Ready", desc: "Download your text-behind-image creations" }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  className="p-4 sm:p-6 rounded-2xl bg-white/60 dark:bg-surface-800/60 backdrop-blur-sm border border-surface-200/50 dark:border-surface-700/50 shadow-card hover:shadow-soft transition-all duration-300"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-card">
                    <ApperIcon name={feature.icon} className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 text-surface-900 dark:text-surface-100">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-surface-600 dark:text-surface-400">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Floating decorative elements */}
        <motion.div 
          className="absolute top-20 left-10 w-20 h-20 bg-primary-400/20 rounded-full blur-xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-32 h-32 bg-secondary-400/20 rounded-full blur-xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </motion.section>

      {/* Main Feature Section */}
      <motion.section 
        className="py-8 sm:py-12 lg:py-16"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <MainFeature />
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="py-8 sm:py-12 border-t border-surface-200/50 dark:border-surface-700/50 backdrop-blur-xl bg-white/80 dark:bg-surface-900/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div 
              className="flex items-center justify-center space-x-3 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <ApperIcon name="Image" className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                BackDropify
              </span>
            </motion.div>
            <p className="text-surface-600 dark:text-surface-400 text-sm sm:text-base">
              © 2024 BackDropify. Creating beautiful image compositions made simple.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}

export default Home