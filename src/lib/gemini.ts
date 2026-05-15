import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiApiKey } from './config'

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = getGeminiApiKey()
    if (!apiKey) throw new Error('No Gemini API key available')
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

export async function generateWithGemini(prompt: string, model = 'gemini-1.5-flash'): Promise<string> {
  try {
    const genAI = getGenAI()
    const geminiModel = genAI.getGenerativeModel({ model })
    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

export async function classifyIntentWithGemini(text: string): Promise<any> {
  const prompt = `Classify the intent of this voice command into one of: ADD_TODO, SCHEDULE_EVENT, NOISE.
Voice command: "${text}"
Reply with JSON only: {"type":"ADD_TODO","text":"..."} or {"type":"SCHEDULE_EVENT","title":"...","time":"..."} or {"type":"NOISE"}`

  const response = await generateWithGemini(prompt)
  const match = response.match(/\{.*\}/s)
  if (match) {
    return JSON.parse(match[0])
  }
  throw new Error('Invalid response format')
}

export async function summarizeMeetingWithGemini(transcript: string): Promise<string> {
  const prompt = `Summarise this meeting transcript in 3-5 bullet points. Include key decisions and action items.\n\nTranscript:\n${transcript}`
  return await generateWithGemini(prompt)
}