import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ApperIcon from '../components/ApperIcon'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-white to-primary-50 dark:from-surface-900 dark:via-surface-800 dark:to-primary-900">
      <motion.div 
        className="text-center max-w-md mx-auto px-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-card"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ApperIcon name="AlertTriangle" className="w-12 h-12 text-white" />
        </motion.div>
        
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-2xl font-semibold mb-4 text-surface-900 dark:text-surface-100">
          Page Not Found
        </h2>
        <p className="text-surface-600 dark:text-surface-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Link to="/">
          <motion.button
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium shadow-card hover:shadow-soft transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ApperIcon name="Home" className="w-5 h-5" />
            <span>Back to Home</span>
          </motion.button>
        </Link>
      </motion.div>
    </div>
  )
}

export default NotFound