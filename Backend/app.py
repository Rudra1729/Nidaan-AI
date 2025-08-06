from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
import json
from pydub import AudioSegment
from google.cloud import speech
from google.cloud import texttospeech
from google.oauth2 import service_account
from google.cloud import translate_v2 as translate
import requests
import RAG


MODEL_NAME = "nidaan:latest"  # Change to your model name
API_LINK = "Add your ollama API link here"  # Change to your Ollama API link

# Initialize Google Cloud clients with same credentials
import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'Add your Google Cloud service account JSON key file path here'
speech_client = speech.SpeechClient()
texttospeech_client = texttospeech.TextToSpeechClient()
translate_client = translate.Client()


system_prompt = (
    '''You are NidaanAI, a warm and knowledgeable virtual health companion for people in Indrad village, Gujarat, and nearby rural areas. Your role is to explain health topics, give practical local advice, and help users understand when professional medical help is needed.
Speak clearly, in simple English suited for easy listening, using 120-200 words per reply. Always sound caring and approachable, as a trusted neighbor would. Tailor your answers for a rural Indian context, mentioning home remedies and familiar local examples when possible.
When the user describes common or mild symptoms (headache, cough, minor fevers, stomach upset, joint pain), follow this structure:
	•	Explain possible common causes, mentioning specific conditions familiar locally (like seasonal fever, food poisoning, joint pains due to hard work).
	•	Name at least two early warning signs to watch for.
	•	Recommend safe, practical home remedies using locally known methods and ingredients, like warm haldi milk, jeera water, salt water gargle, rice water, ajwain, or gentle warm compress. Explain why these might help.
	•	If the user mentions moderate symptoms or risk factors (elderly, baby, diabetic, symptoms lasting >2 days), clearly say when to visit the Primary Health Centre (PHC) or call the local ASHA worker.
	•	Always end with: “This is general information. If your symptoms worsen or do not improve, please visit a doctor or your nearest PHC.”
When the user mentions potentially serious symptoms (such as chest pain, trouble breathing, fainting, unexplained high fever in a child or elderly, fits, blood vomiting, severe pain, confusion, severe weakness, or dehydration), respond with:
	•	Calm reassurance and one safe first step (e.g., let the person rest, give sips of clean water if awake).
	•	Advise seeing a doctor or going to the PHC immediately.
	•	Mention that these symptoms can be signs of serious conditions (give examples such as heart attack, dehydration, severe infection, dengue, or fits) and need urgent attention.
	•	Encourage the user to inform a family member or local health worker, such as the ASHA.
	•	Close with: “This is general information. For serious or lasting problems, always see a qualified doctor as soon as possible.”
If the user asks about health costs, accessing care, or support:
	•	Mention major government health schemes like Ayushman Bharat, MA Yojana, and Chiranjeevi Yojana. Briefly explain the benefits (like free or subsidized treatment) and how villagers can access them at PHC or with their ration/Aadhaar card.
	•	Encourage asking the local ASHA worker or PHC staff for details.
Never recommend or list medicines, doses, injections, or stopping prescribed treatment. Never confirm a diagnosis.
If unsure, honestly say you do not know, and advise seeing a doctor or visiting the nearest PHC.
Always prioritize safety: give immediate home care advice first, tell users what signs mean they must get medical help, and smoothly connect each answer to the next needed action. Use your connected knowledge source (RAG) to mention relevant diseases, government programs, and local health facts as needed.
End every response with:
“This is general information. If you have any serious or ongoing health issues, please see a doctor or visit your nearest PHC.”'''
)



def transcribe_audio_with_google(audio_file_path, language_code="gu-IN"):
    """Transcribe audio using Google Speech-to-Text API for Gujarati"""
    try:
        # Read the audio file
        with open(audio_file_path, "rb") as audio_file:
            content = audio_file.read()
        
        # Configure the recognition
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            language_code=language_code,  # Use the provided language code
            enable_automatic_punctuation=True,
            enable_word_time_offsets=False,
            enable_word_confidence=False,
        )
        
        # Perform the transcription
        response = speech_client.recognize(config=config, audio=audio)
        
        # Extract the transcribed text
        if response.results:
            transcribed_text = ""
            for result in response.results:
                if result.alternatives:
                    transcribed_text += result.alternatives[0].transcript + " "
            return transcribed_text.strip()
        else:
            return ""
            
    except Exception as e:
        print(f"Google Speech-to-Text error: {e}")
        return ""

def chat_with_ollama(message, history):
    if history is None:
        history = []

    messages = [{"role": "system", "content": system_prompt}]
    for entry in history:
        if not (isinstance(entry, dict) and "role" in entry and "content" in entry):
            continue
        if entry["role"] in ("user", "assistant"):
            messages.append({"role": entry["role"], "content": entry["content"]})

    _, collection, chunk_texts = RAG.load_index()
    # If ChromaDB folder or collection is missing or has no embeddings/chunks, build it
    if not chunk_texts or len(chunk_texts) == 0:
        print("No embeddings found: Generating index from rural_health_knowledge.txt...")
        RAG.prepare_index("rural_health_knowledge.txt")
        # Try loading again after preparing
        _, collection, chunk_texts = RAG.load_index()
    context = RAG.retrieve_context(message, collection, chunk_texts, top_k=3)
    prompt = RAG.build_prompt(message, context)

    messages.append({"role": "user", "content": prompt})

    data = {"model": MODEL_NAME, "messages": messages}

    try:
        response = requests.post(f"{API_LINK}/api/chat", json=data, stream=True)
        # Read response line by line (each is a JSON object)
        assistant_reply = ""
        for line in response.iter_lines():
            if not line:
                continue
            resp_chunk = json.loads(line)
            # Each chunk is a partial response. Append content.
            if "message" in resp_chunk and "content" in resp_chunk["message"]:
                assistant_reply += resp_chunk["message"]["content"]
            if resp_chunk.get("done"):
                break

        new_history = history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": assistant_reply}
        ]
        return new_history
    except Exception as e:
        print(f"Local API request error: {e}")
        return history


def generate_google_tts(text, voice_name="gu-IN-Standard-A"):
    """Generate high-quality Gujarati speech using Google Cloud TTS"""
    try:
        # Configure the synthesis input
        synthesis_input = texttospeech.SynthesisInput(text=text)
        
        # Build the voice request
        voice = texttospeech.VoiceSelectionParams(
            language_code="gu-IN",
            name=voice_name,
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )
        
        # Select the type of audio file to return
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        # Perform the text-to-speech request
        response = texttospeech_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        
        # Save the audio to a file
        output_filename = "google_tts_output.mp3"
        with open(output_filename, "wb") as out:
            out.write(response.audio_content)
        
        return output_filename
        
    except Exception as e:
        print(f"Google TTS error: {e}")
        return None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat")
def chat_endpoint(message: str = Form(...), history: str = Form(None), generate_audio: str = Form("false"), lang: str = Form("en")):
    import json
    # Parse and validate history
    history_obj = None
    if history:
        try:
            history_obj = json.loads(history)
            if not isinstance(history_obj, list):
                history_obj = []
        except (json.JSONDecodeError, TypeError):
            history_obj = []
    else:
        history_obj = []

    # Translation pipeline
    if lang == "gu":
        # Translate Gujarati user input to English
        translation = translate_client.translate(message, source_language="gu", target_language="en")
        message_for_model = translation["translatedText"]
    else:
        message_for_model = message

    updated_history = chat_with_ollama(message_for_model, history_obj)
    # Get the last assistant reply
    assistant_reply = None
    if isinstance(updated_history, list) and len(updated_history) > 0:
        for entry in reversed(updated_history):
            if isinstance(entry, dict) and entry.get("role") == "assistant":
                assistant_reply = entry.get("content")
                break
    # Translate model reply back to Gujarati if needed
    if lang == "gu" and assistant_reply:
        translation = translate_client.translate(assistant_reply, source_language="en", target_language="gu")
        assistant_reply_gu = translation["translatedText"]
        # Update the last assistant reply in history
        for entry in reversed(updated_history):
            if isinstance(entry, dict) and entry.get("role") == "assistant":
                entry["content"] = assistant_reply_gu
                break
        assistant_reply = assistant_reply_gu
    audio_url = None
    if generate_audio.lower() == "true" and assistant_reply:
        tts_filename = generate_google_tts(assistant_reply)
        if tts_filename and os.path.exists(tts_filename):
            audio_url = f"/api/audio/{tts_filename}"
    if audio_url:
        return JSONResponse({"history": updated_history, "audio_url": audio_url})
    else:
        return JSONResponse({"history": updated_history})

@app.post("/api/audio-chat")
def audio_chat_endpoint(audio: UploadFile = File(...), history: str = Form(None), generate_audio: str = Form("false"), lang: str = Form("en")):
    import json
    try:
        # Parse and validate history
        history_obj = None
        if history:
            try:
                history_obj = json.loads(history)
                if not isinstance(history_obj, list):
                    history_obj = []
            except (json.JSONDecodeError, TypeError):
                history_obj = []
        else:
            history_obj = []
            
        audio_bytes = audio.file.read()
        
        # Check if audio data is valid
        if len(audio_bytes) == 0:
            return JSONResponse({"error": "No audio data received"}, status_code=400)
        
        # Save the uploaded file as webm
        with open("temp_audio.webm", "wb") as f:
            f.write(audio_bytes)
        
        print(f"Audio file size: {len(audio_bytes)} bytes")
        
        # Check if file was saved properly
        if not os.path.exists("temp_audio.webm") or os.path.getsize("temp_audio.webm") == 0:
            return JSONResponse({"error": "Failed to save audio file"}, status_code=500)
        
        try:
            # Try to convert webm to wav
            sound = AudioSegment.from_file("temp_audio.webm")
            sound.export("temp_audio.wav", format="wav", parameters=["-acodec", "pcm_s16le"])
            print("Audio conversion successful")
        except Exception as e:
            print(f"Audio conversion error: {e}")
            # Try alternative approach - save as wav directly
            try:
                with open("temp_audio.wav", "wb") as f:
                    f.write(audio_bytes)
                print("Saved audio as wav directly")
            except Exception as e2:
                print(f"Direct wav save failed: {e2}")
                return JSONResponse({"error": f"Audio conversion failed: {str(e)}"}, status_code=500)
        
        if lang == "gu":
            language_code = "gu-IN"
        else:
            language_code = "en-US"
        gujarati_text = transcribe_audio_with_google("temp_audio.wav", language_code=language_code)
        if not gujarati_text:
            print("No text transcribed from audio")
            return JSONResponse({"history": history_obj})
        # Translation pipeline
        if lang == "gu":
            # Translate Gujarati user input to English
            translation = translate_client.translate(gujarati_text, source_language="gu", target_language="en")
            message_for_model = translation["translatedText"]
        else:
            message_for_model = gujarati_text
        updated_history = chat_with_ollama(message_for_model, history_obj)
        # Get the last assistant reply
        assistant_reply = None
        if isinstance(updated_history, list) and len(updated_history) > 0:
            for entry in reversed(updated_history):
                if isinstance(entry, dict) and entry.get("role") == "assistant":
                    assistant_reply = entry.get("content")
                    break
        # Translate model reply back to Gujarati if needed
        if lang == "gu" and assistant_reply:
            translation = translate_client.translate(assistant_reply, source_language="en", target_language="gu")
            assistant_reply_gu = translation["translatedText"]
            # Update the last assistant reply in history
            for entry in reversed(updated_history):
                if isinstance(entry, dict) and entry.get("role") == "assistant":
                    entry["content"] = assistant_reply_gu
                    break
            assistant_reply = assistant_reply_gu
        audio_url = None
        if generate_audio.lower() == "true" and assistant_reply:
            tts_filename = generate_google_tts(assistant_reply)
            if tts_filename and os.path.exists(tts_filename):
                audio_url = f"/api/audio/{tts_filename}"
        if audio_url:
            return JSONResponse({"history": updated_history, "audio_url": audio_url})
        else:
            return JSONResponse({"history": updated_history})
        
    except Exception as e:
        print(f"Audio chat endpoint error: {e}")
        return JSONResponse({"error": f"Audio processing failed: {str(e)}"}, status_code=500)

@app.get("/api/audio/{filename}")
def get_audio_file(filename: str):
    """Serve generated audio files"""
    if os.path.exists(filename):
        return FileResponse(
            path=filename,
            media_type="audio/wav",
            filename=filename
        )
    else:
        return JSONResponse({"error": "Audio file not found"}, status_code=404)

@app.post("/api/clear")
def clear_endpoint():
    return JSONResponse({"history": []})

@app.post("/api/google-tts")
def google_tts_endpoint(text: str = Form(...)):
    """Generate high-quality Gujarati speech using Google Cloud TTS"""
    try:
        output_filename = generate_google_tts(text)
        if output_filename and os.path.exists(output_filename):
            return FileResponse(
                path=output_filename,
                media_type="audio/mp3",
                filename="gujarati_speech.mp3"
            )
        else:
            return JSONResponse({"error": "Failed to generate audio"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": f"TTS generation failed: {str(e)}"}, status_code=500)
    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
