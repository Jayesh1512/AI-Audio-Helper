import { DeepgramClient } from '@deepgram/sdk'

export class DeepgramSpeechService {
  private client: DeepgramClient
  private connection: any = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private onTranscript: (transcript: string, isFinal: boolean) => void
  private onError: (error: string) => void

  constructor(
    apiKey: string,
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ) {
    this.client = new DeepgramClient({ apiKey })
    this.onTranscript = onTranscript
    this.onError = onError
  }

  async startListening(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.connection = await this.client.listen.v1.connect({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
      } as any)

      this.connection.on('open', () => {
        this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType: 'audio/webm' })
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.connection) {
            this.connection.sendMedia(event.data)
          }
        }
        this.mediaRecorder.start(250)
      })

      this.connection.on('message', (data: any) => {
        if (data.type === 'Results') {
          const transcript = data.channel.alternatives[0].transcript
          if (transcript) {
            this.onTranscript(transcript, data.is_final)
          }
        }
      })

      this.connection.on('error', (error: Error) => {
        console.error('Deepgram error:', error)
        this.onError(error.message || 'Deepgram error')
      })

      this.connection.on('close', () => {
        console.log('Deepgram connection closed')
      })

    } catch (error) {
      console.error('Failed to start Deepgram listening:', error)
      this.onError('Failed to start speech recognition')
    }
  }

  stopListening(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
  }
}