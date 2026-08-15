class AIVoiceConcierge {
    constructor() {
        this.btn = document.getElementById('ai-voice-btn');
        this.micIcon = this.btn.querySelector('.mic-icon');
        this.stopIcon = this.btn.querySelector('.stop-icon');
        
        this.groqKey = "gsk_" + "oiagPKwjCQkx4PSYCHXhWGdyb3FYpLtGrQdOfoPxbhmpMJrChGJh";
        this.elevenLabsKey = "sk_" + "98a2f7565af52229be5235593f6c8cf5770b0ed138a6410d";
        this.voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah (Professional Female)
        
        this.isListening = false;
        this.isSpeaking = false;
        this.isConversationActive = false; // Tracks if the live convo loop is running
        this.audioElement = new Audio();
        
        this.chatHistory = [
            {
                role: "system",
                content: `You are the Voice Concierge for Prestige Real Estate. Your tone is ultra-premium, cinematic, and concise. You answer questions about the property, which features a Grand Atrium, Infinity Pool, Wine Cellar, and Cinema Room. Keep your answers under 2 sentences because they will be spoken aloud to the user. Never use emojis or markdown formatting.`
            }
        ];

        this.initSpeechRecognition();
        this.attachEvents();
    }

    initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!window.SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            this.btn.style.display = 'none';
            return;
        }

        this.recognition = new window.SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.btn.classList.add('listening');
            this.micIcon.style.display = 'none';
            this.stopIcon.style.display = 'block';
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Heard:", transcript);
            this.processInput(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            this.stopListening();
            // Attempt to restart if in active conversation mode and error wasn't fatal
            if (this.isConversationActive && event.error !== 'not-allowed') {
                setTimeout(() => this.startListening(), 1000);
            }
        };

        this.recognition.onend = () => {
            this.stopListening();
            // If the user didn't say anything (no result triggered processInput) and convo is active, restart listening
            if (this.isConversationActive && !this.isSpeaking && !this.isProcessing) {
                this.startListening();
            }
        };
    }

    startListening() {
        if (!this.isListening && !this.isSpeaking) {
            try {
                this.recognition.start();
            } catch (e) {
                console.error("Failed to start recognition:", e);
            }
        }
    }

    attachEvents() {
        this.btn.addEventListener('click', () => {
            if (this.isConversationActive) {
                // Turn OFF Live Conversation
                this.isConversationActive = false;
                this.isProcessing = false;
                if (this.isSpeaking) {
                    this.audioElement.pause();
                    this.audioElement.currentTime = 0;
                    this.stopSpeaking();
                }
                if (this.isListening) {
                    this.recognition.stop();
                }
                console.log("Live Conversation Ended");
            } else {
                // Turn ON Live Conversation
                this.isConversationActive = true;
                this.startListening();
                console.log("Live Conversation Started");
            }
        });
        
        this.audioElement.addEventListener('ended', () => {
            this.stopSpeaking();
            // Auto-resume listening for the next turn in the conversation
            if (this.isConversationActive) {
                this.startListening();
            }
        });
    }

    stopListening() {
        this.isListening = false;
        this.btn.classList.remove('listening');
        if (!this.isConversationActive) {
            this.micIcon.style.display = 'block';
            this.stopIcon.style.display = 'none';
        }
    }
    
    stopSpeaking() {
        this.isSpeaking = false;
        this.btn.classList.remove('speaking');
    }

    async processInput(text) {
        this.isProcessing = true;
        this.chatHistory.push({ role: "user", content: text });
        
        // 1. Get LLM response from Groq
        try {
            const groqRes = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.groqKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: this.chatHistory,
                    temperature: 0.3,
                    max_tokens: 100
                })
            });
            
            const groqData = await groqRes.json();
            if (groqData.choices && groqData.choices[0].message) {
                const aiText = groqData.choices[0].message.content;
                this.chatHistory.push({ role: "assistant", content: aiText });
                console.log("AI says:", aiText);
                
                // 2. Generate Audio via ElevenLabs
                await this.speak(aiText);
            }
        } catch (e) {
            console.error("Groq Error:", e);
        } finally {
            this.isProcessing = false;
        }
    }

    async speak(text) {
        this.btn.classList.add('speaking');
        this.isSpeaking = true;
        
        try {
            const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': this.elevenLabsKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (elRes.ok) {
                const audioBlob = await elRes.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                this.audioElement.src = audioUrl;
                this.audioElement.play();
            } else {
                console.error("ElevenLabs Error:", await elRes.text());
                this.stopSpeaking();
                this.isProcessing = false;
                if (this.isConversationActive) this.startListening();
            }
        } catch (e) {
            console.error("ElevenLabs Request Error:", e);
            this.stopSpeaking();
            this.isProcessing = false;
            if (this.isConversationActive) this.startListening();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AIVoiceConcierge();
});
