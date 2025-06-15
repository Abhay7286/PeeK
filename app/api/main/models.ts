import { createClient } from '@supabase/supabase-js'

// Types
export interface ApiModel {
  id?: number
  api_name: string
  model_name: string
  created_at?: string
  updated_at?: string
}

export interface GroqModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface ModelUpdateResult {
  success: boolean
  message: string
  data?: ApiModel
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cache for models to reduce API calls
let modelCache: Record<string, string> = {}
let cacheTimestamp = 0
let availableGroqModels: GroqModel[] = []
let groqModelsTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch available models from Groq API
 */
export async function fetchGroqModels(): Promise<GroqModel[]> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch Groq models')
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching Groq models:', error)
    // Return fallback models if API fails
    return [
      { id: 'llama-3.1-70b-versatile', object: 'model', created: 0, owned_by: 'groq' },
      { id: 'llama-3.1-8b-instant', object: 'model', created: 0, owned_by: 'groq' },
      { id: 'mixtral-8x7b-32768', object: 'model', created: 0, owned_by: 'groq' }
    ]
  }
}

/**
 * Get cached Groq models or fetch new ones
 */
export async function getAvailableGroqModels(): Promise<GroqModel[]> {
  const now = Date.now()
  
  if (now - groqModelsTimestamp > CACHE_DURATION || availableGroqModels.length === 0) {
    availableGroqModels = await fetchGroqModels()
    groqModelsTimestamp = now
  }
  
  return availableGroqModels
}

/**
 * Get all API model configurations from Supabase
 */
export async function getAllApiModels(): Promise<ApiModel[]> {
  try {
    const { data, error } = await supabase
      .from('api_models')
      .select('*')
      .order('api_name')
    
    if (error) {
      console.error('Error fetching all models:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('Error:', err)
    return []
  }
}

/**
 * Get model name for a specific API with caching
 */
export async function getModelName(apiName: string): Promise<string> {
  const now = Date.now()
  
  // Check if cache is still valid
  if (now - cacheTimestamp > CACHE_DURATION) {
    // Refresh cache
    const allModels = await getAllApiModels()
    modelCache = {}
    allModels.forEach(model => {
      modelCache[model.api_name] = model.model_name
    })
    cacheTimestamp = now
  }
  
  return modelCache[apiName] || 'llama-3.1-70b-versatile'
}

/**
 * Update model name for a specific API
 */
export async function updateModelName(apiName: string, newModelName: string): Promise<ModelUpdateResult> {
  try {
    // First check if the model exists in Groq's available models
    const groqModels = await getAvailableGroqModels()
    const isValidModel = groqModels.some(model => model.id === newModelName)
    
    if (!isValidModel) {
      return {
        success: false,
        message: `Model "${newModelName}" is not available in Groq. Please select from available models.`
      }
    }
    
    const { data, error } = await supabase
      .from('api_models')
      .update({ 
        model_name: newModelName,
        updated_at: new Date().toISOString()
      })
      .eq('api_name', apiName)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating model name:', error)
      return {
        success: false,
        message: `Failed to update model: ${error.message}`
      }
    }
    
    // Clear cache to force refresh
    modelCache = {}
    cacheTimestamp = 0
    
    return {
      success: true,
      message: `Successfully updated ${apiName} model to ${newModelName}`,
      data
    }
  } catch (err) {
    console.error('Error:', err)
    return {
      success: false,
      message: 'An unexpected error occurred while updating the model'
    }
  }
}

/**
 * Create a new API model configuration
 */
export async function createApiModel(apiName: string, modelName: string): Promise<ModelUpdateResult> {
  try {
    // Validate model exists in Groq
    const groqModels = await getAvailableGroqModels()
    const isValidModel = groqModels.some(model => model.id === modelName)
    
    if (!isValidModel) {
      return {
        success: false,
        message: `Model "${modelName}" is not available in Groq. Please select from available models.`
      }
    }
    
    const { data, error } = await supabase
      .from('api_models')
      .insert({
        api_name: apiName,
        model_name: modelName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating model:', error)
      return {
        success: false,
        message: `Failed to create model: ${error.message}`
      }
    }
    
    // Clear cache to force refresh
    modelCache = {}
    cacheTimestamp = 0
    
    return {
      success: true,
      message: `Successfully created ${apiName} with model ${modelName}`,
      data
    }
  } catch (err) {
    console.error('Error:', err)
    return {
      success: false,
      message: 'An unexpected error occurred while creating the model'
    }
  }
}

/**
 * Delete an API model configuration
 */
export async function deleteApiModel(apiName: string): Promise<ModelUpdateResult> {
  try {
    const { error } = await supabase
      .from('api_models')
      .delete()
      .eq('api_name', apiName)
    
    if (error) {
      console.error('Error deleting model:', error)
      return {
        success: false,
        message: `Failed to delete model: ${error.message}`
      }
    }
    
    // Clear cache to force refresh
    modelCache = {}
    cacheTimestamp = 0
    
    return {
      success: true,
      message: `Successfully deleted ${apiName} model configuration`
    }
  } catch (err) {
    console.error('Error:', err)
    return {
      success: false,
      message: 'An unexpected error occurred while deleting the model'
    }
  }
}

/**
 * Get model options for dropdown (combines current API models and available Groq models)
 */
export async function getModelOptions(): Promise<{
  currentModels: ApiModel[]
  availableModels: GroqModel[]
}> {
  try {
    const [currentModels, availableModels] = await Promise.all([
      getAllApiModels(),
      getAvailableGroqModels()
    ])
    
    return {
      currentModels,
      availableModels
    }
  } catch (error) {
    console.error('Error getting model options:', error)
    return {
      currentModels: [],
      availableModels: []
    }
  }
}

/**
 * Validate if a model name is available in Groq
 */
export async function validateGroqModel(modelName: string): Promise<boolean> {
  try {
    const groqModels = await getAvailableGroqModels()
    return groqModels.some(model => model.id === modelName)
  } catch (error) {
    console.error('Error validating model:', error)
    return false
  }
}

/**
 * Refresh all caches
 */
export function clearCache(): void {
  modelCache = {}
  cacheTimestamp = 0
  availableGroqModels = []
  groqModelsTimestamp = 0
}