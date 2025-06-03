import backgroundsData from '../mockData/backgrounds.json'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let backgrounds = [...backgroundsData]

const backgroundService = {
  async getAll() {
    await delay(300)
    return [...backgrounds]
  },

  async getById(id) {
    await delay(200)
    const background = backgrounds.find(bg => bg.id === id)
    if (!background) {
      throw new Error('Background not found')
    }
    return { ...background }
  },

  async create(backgroundData) {
    await delay(400)
    const newBackground = {
      ...backgroundData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    backgrounds.push(newBackground)
    return { ...newBackground }
  },

  async update(id, updates) {
    await delay(300)
    const index = backgrounds.findIndex(bg => bg.id === id)
    if (index === -1) {
      throw new Error('Background not found')
    }
    backgrounds[index] = { ...backgrounds[index], ...updates, updatedAt: new Date().toISOString() }
    return { ...backgrounds[index] }
  },

  async delete(id) {
    await delay(250)
    const index = backgrounds.findIndex(bg => bg.id === id)
    if (index === -1) {
      throw new Error('Background not found')
    }
    const deletedBackground = backgrounds.splice(index, 1)[0]
    return { ...deletedBackground }
  },

  async getByCategory(category) {
    await delay(250)
    const filtered = backgrounds.filter(bg => bg.category === category)
    return [...filtered]
  },

  async searchByTags(tags) {
    await delay(300)
    const filtered = backgrounds.filter(bg => 
      bg.tags?.some(tag => tags.includes(tag))
    )
    return [...filtered]
  }
}

export default backgroundService