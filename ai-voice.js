class AIVoiceConcierge {
    constructor() {
        this.btn = document.getElementById('ai-voice-btn');
        this.micIcon = this.btn.querySelector('.mic-icon');
        this.stopIcon = this.btn.querySelector('.stop-icon');
        this.statusEl = document.getElementById('ai-voice-status');
        this.closeBtn = document.getElementById('ai-voice-close');
        
        this.groqKey = "gsk_" + "oiagPKwjCQkx4PSYCHXhWGdyb3FYpLtGrQdOfoPxbhmpMJrChGJh";
        this.elevenLabsKey = "sk_" + "94dc8c0df728763756f5485245c2e0e1dbb4297f23e3e686";
        this.voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah (Professional Female)
        
        this.isListening = false;
        this.isSpeaking = false;
        this.isConversationActive = false; // Tracks if the live convo loop is running
        this.audioElement = new Audio();
        this.tooltip = this.btn.querySelector('.ai-voice-tooltip');
        
        // Show tooltip after 3 seconds
        setTimeout(() => {
            if (this.tooltip && !this.isConversationActive) {
                this.tooltip.classList.add('show');
            }
        }, 3000);
        
        this.chatHistory = [
            {
                role: "system",
                content: `You are the Voice Concierge for Prestige Real Estate. Your goal is to guide the user through a booking funnel for a luxury property.
CRITICAL RULES:
- Keep all responses under 2 sentences.
- Only ask ONE question at a time.
- Your tone is ultra-premium, cinematic, and professional. No emojis or markdown.

FUNNEL STEPS (Follow strictly in order):
1. Pitch the property (Grand Atrium, Infinity Pool, Wine Cellar, Cinema Room) and ask if they are looking to purchase within the next 3 to 6 months.
2. If qualified, ask if they prefer an In-Person or Virtual viewing.
3. Offer two slots (e.g., "Thursday at 2 PM or Friday at 10 AM") and ask which works best.
4. Once a time is chosen, you MUST collect their Name, Phone Number, and Email ONE AT A TIME using the following logic:

   FOR THE NAME:
   - Ask for their full name. 
   - After they answer, politely ask them to spell it out "just to be sure".
   - After they spell it, repeat the spelled-out version back to them (e.g., "Thank you. S-M-I-T-H. Is that correct?").
   
   FOR THE PHONE NUMBER & EMAIL:
   - Ask for the item (e.g., "What is your phone number?").
   - After they answer, DO NOT ask them to spell it out. Instead, immediately read it back to them clearly and ask if it is correct (e.g., "Thank you. 5-5-5-0-1-9-9. Is that correct?" or "J-O-H-N at G-M-A-I-L dot com. Is that correct?").

   ONLY move to the next item after they say "yes". If they say "no", ask them to repeat it.
5. Once all three are confirmed, finalize the booking and say an agent will reach out shortly. 
   CRITICAL: On your final confirmation message, you MUST append this EXACT string at the very end of your response:
   [LEAD_CAPTURED: {"name":"their_name", "phone":"their_phone", "email":"their_email"}]`
            }
        ];

        this.initSpeechRecognition();
        this.attachEvents();
    }

    initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!window.SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            this.isSupported = false;
            return;
        }
        
        this.isSupported = true;
        this.recognition = new window.SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.btn.classList.add('listening');
            this.micIcon.style.display = 'none';
            this.stopIcon.style.display = 'block';
            this.updateStatus("Listening...");
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
        const toggleConversation = () => {
            if (!this.isSupported) {
                alert("Your browser does not support the Web Speech API. Please open this site in Google Chrome, Microsoft Edge, or Safari to use the Voice AI feature.");
                return;
            }
            if (this.isConversationActive) {
                // Turn OFF Live Conversation
                this.isConversationActive = false;
                this.isProcessing = false;
                document.body.classList.remove('ai-active');
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
                document.body.classList.add('ai-active');
                this.updateStatus("Connecting...");
                this.startListening();
                console.log("Live Conversation Started");
            }
        };

        this.btn.addEventListener('mouseenter', () => {
            if (this.tooltip) this.tooltip.classList.remove('show');
        });

        this.btn.addEventListener('click', toggleConversation);
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                if (this.isConversationActive) toggleConversation();
            });
        }
        
        this.audioElement.addEventListener('ended', () => {
            this.stopSpeaking();
            // Auto-resume listening for the next turn in the conversation
            if (this.isConversationActive) {
                this.startListening();
            }
        });
    }

    updateStatus(text) {
        if (this.statusEl) {
            this.statusEl.textContent = text;
        }
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
        this.updateStatus("Processing...");
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
                let aiText = groqData.choices[0].message.content;
                
                // Extract lead capture data if present
                const leadMatch = aiText.match(/\[LEAD_CAPTURED:\s*(\{.*?\})\s*\]/);
                if (leadMatch) {
                    try {
                        const leadData = JSON.parse(leadMatch[1]);
                        const existingLeads = JSON.parse(localStorage.getItem('prestige_leads') || '[]');
                        existingLeads.push(leadData);
                        localStorage.setItem('prestige_leads', JSON.stringify(existingLeads));
                        console.log("Lead Saved to LocalStorage:", leadData);
                        
                        // Clean the text so ElevenLabs doesn't speak the JSON
                        aiText = aiText.replace(/\[LEAD_CAPTURED:\s*(\{.*?\})\s*\]/, '');
                    } catch(e) {
                        console.error("Failed to parse lead data", e);
                    }
                }
                
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
        this.updateStatus("Prestige AI is speaking...");
        
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
