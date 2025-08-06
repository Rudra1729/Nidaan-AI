# Nidaan-AI

## 🩺 Try Out Nidaan AI  
Experience how Nidaan AI guides users through early symptom detection, local remedies, and government healthcare schemes — all in their own language.

👉 [Launch the Demo](https://heartfelt-platypus-f0db33.netlify.app)


## 🎧 Listen to the Story of Nidaan AI  
Dive into how two students, a village visit, and an ambitious dream turned into a multilingual AI nurse for rural India.  
[Watch the full story here](https://youtu.be/VDGO5v3DKh4)


##  📢 Our LinkedIn Launch Post  
We shared Nidaan AI with the world — and the response was overwhelming.  
See the full post, community reactions, and behind-the-scenes story:

👉 [Read the LinkedIn Post](https://shorturl.at/9rO8C)

## 📓 Explore the Google Colab Notebook  
Curious how we fine-tuned Nidaan AI with QLoRA, Unsloth and 8 bit quantisation?
Walk through our full pipeline — from dataset prep to model training.

👉 [Open in Google Colab](https://colab.research.google.com/drive/1SgXqXllUDrDfWDJz7c8NuPh2UWkVZ9kS?usp=sharing)

## 🧠 Download the Nidaan AI Model (GGUF Format)  
We’ve open-sourced our fine-tuned Gemma model in GGUF format for offline deployment and experimentation.

Use it with Ollama or llama.cpp to run Nidaan AI locally — no internet required.

👉 [Download GGUF Model](https://www.kaggle.com/models/rudra2006/nidaan-ai)


## Introduction.

In rural India, a 30-minute wait for a hospital can be the difference between life and death. WE (Nithun Sundarrajan and Rudra Patel)  flew from UK and USA to the heart of a village in Gujarat, saw this reality firsthand, and built an AI nurse that could change it…

In many Indian villages, by the time help arrives… it’s already too late.
30 minutes to the nearest clinic.
No internet.
Language barriers.
And no one to tell you if that chest pain is something serious.
So we went to the ground first - to Indral, Gujarat - and built something for them, with them.

 Our mission was simple:
To build an AI nurse that speaks Gujarati, understands the needs of rural villagers, and will soon run entirely offline ,offering timely guidance before it’s too late. We chose the name “Nidaan “ because it means "Diagnosis" or "Cause Identification" in Gujarati and Hindi

## How We Built Nidaan AI  – Powered by Gemma 3n

**Multimodal + Multilingual Support**  
We used Gemma’s voice and text capabilities to enable seamless Gujarati conversations. This allowed villagers to speak naturally and receive understandable guidance without needing to read or write.

**Powered by Gemma 2B: Built for Remote Access**  
Using Gemma’s ultra-light 2B parameter model, we optimized Nidaan AI for low-power devices commonly found in rural areas. Our current prototype runs on minimal connectivity.  We are actively working towards full offline deployment , enabling uninterrupted real-time healthcare access in even the most remote villages.

**Unsloth AI Fine-Tuning and RAG Architecture**  
We curated a health-specific dataset from multiple trusted sources and Indral Village ,  fine-tuned the model using Unsloth with QLoRA technique . Training was performed on Google Colab computing units using L4 GPUs with 8-bit quantization. This, combined with a Retrieval-Augmented Generation (RAG) pipeline, made Nidaan AI fast, context-aware, and able to deliver medically relevant responses in local contexts.

**Local Remedies and Government Schemes**  
We included safe, household-based remedies like ginger tea for cough and turmeric for inflammation. Additionally, Nidaan AI educates users about Indian and Gujarat-specific healthcare schemes such as Ayushman Bharat and MA Yojana, building trust through accessible, culturally-relevant guidance.

## Problems We Faced and How We Overcame Them

1. We were ambitious to create real impact through AI in rural healthcare, but we were absolute beginners in fine-tuning large language models.

2. We conducted a field visit to Indral Village, Gujarat, India. This visit shaped our understanding of the problem and solidified our choice of Gemma 3n. We observed that:
   - Internet connectivity was poor or unavailable
   - Most residents used outdated, low-end mobile phones with limited computational power
   - The majority of the population was illiterate and spoke only their local language, Gujarati
   These constraints aligned perfectly with Gemma 3n’s offline-compatible, low-resource-friendly, and multilingual design.

3. We initially attempted fine-tuning on Kaggle Notebooks but were blocked by dependency issues. Transformer library installations from the official GitHub URLs consistently failed, halting progress.

4. Our first successful setup was in Google Colab using the Transformers library along with PEFT and BitsAndBytes. However, we discovered that the Transformers library did not yet have full architectural support for Gemma 3n, as it was a newly released model.

5. To work around this, we manually downloaded Gemma’s transformer architecture from GitHub. While this allowed us to proceed, the fine-tuning process was highly inefficient and unstable. CUDA errors frequently interrupted training due to the large size of the 2B parameter model and limited memory availability.

6. To increase stability, we upgraded to Google Colab Pro and accessed higher compute units. Surprisingly, we still encountered CUDA memory errors, timeouts, and session crashes, making traditional fine-tuning nearly impossible.

7. We pivoted to using the Unsloth library. This changed everything. Unsloth was significantly more efficient, developer-friendly, and reduced memory usage. We were able to fine-tune with fewer resources and better performance.

8. As beginners, we mistakenly set the training steps to 60, thinking it meant epochs. The model finished training in under 15 minutes. When we tested it, responses were poor, lacked contextual understanding, and failed to meet expectations.

9. After careful reading of documentation and community discussions, we corrected this mistake. We configured the training to run for 3 full epochs. This increased training time to over 12 hours.

10. To prevent session timeouts, we disabled sleep mode on our laptop and kept the session continuously active throughout the fine-tuning process.

11. The results from our first trained model were disappointing. The model was hallucinative, generated manipulative and misleading answers, repeated responses in loops, and ignored max token limits. The outputs were unstructured and unusable.

12. We suspected that the issue lay in the GGUF conversion step for deployment via Ollama. For over a week, we experimented with Llama.cpp, TensorFlow, Hugging Face inference formats, various safe-tensors and adapter configurations. None of them worked reliably.

13. After rigorous debugging and backtracking to first principles, we identified three root causes:
   - Poor data engineering. Our dataset had extremely long, unstructured responses and lacked instructional formatting. This taught us the importance of EDA and structured prompt-response formatting.
   - We were using the raw base Gemma 3n model instead of an instruction-tuned variant. We switched to Gemma-3n-E2B-it to unlock instruction-following capabilities.
   - We initially loaded the model in 4-bit mode, which prevented LoRA adapter merging into the base model. We resolved this by loading the full model and staging it correctly for adapter merging.
   - We were using the wrong chat template format for Gemma 3n, which caused mismatches in prompt formatting and output structure. Once corrected, the model’s response style aligned properly with instruction-based interaction.

14. With all these changes implemented and a new, well-engineered dataset, we began fine-tuning again — this time with confidence. We restructured the data to be concise, context-rich, and instruction-tuned for better alignment.

15. The results from our final model were outstanding. It produced structured, concise, context-aware responses, consistent with our dataset and aligned with the tone of a local AI healthcare assistant.

16. To further enhance factual accuracy, we integrated Retrieval-Augmented Generation (RAG) . This allowed Nidaan AI to dynamically pull relevant health facts from a custom knowledge base. The system became flexible and now can be adapted for any specific village by updating the vector database (and embeddings) with local health data.

## Future Possibilities and Expansion

1. After sharing Nidaan AI on social media, the response was overwhelmingly positive. We received widespread support and encouragement, and were approached by multiple companies interested in including Nidaan AI in their CSR initiatives. Government agencies in India also reached out, expressing interest in scaling this project further.

2. We are currently in discussions with a company whose development team are keen to  help us expand Nidaan AI . The plan discussed is to pre-install it on tablets or mobile phones and distribute it across villages like Indral, making healthcare accessible right out of the box.

3. Several regional media agencies in Gujarat also contacted us, impressed by Nidaan AI’s social impact. They are keen to collaborate on awareness campaigns to drive wider adoption and educate communities.

4. Moving forward, we aim to expand our core team and take the platform completely offline : a milestone we couldn't fully achieve in the current phase due to time and team constraints. Our mission is to scale Nidaan AI across more rural areas where medical access is limited.

5. We are exploring features that would allow users to upload their previous medical records. This would enable Nidaan AI to track health trends, send proactive notifications, conduct periodic check-ins, and deliver personalized, history-based health guidance - all in the user’s native language.

6. On the technical front, we are improving dataset quality further using robust data engineering practices. We are also exploring advanced RAG techniques and chunking strategies to improve retrieval precision and reduce response latency.

7. Integration with government health schemes like Ayushman Bharat(India's flagship free healthcare scheme), MA Yojana(Gujarat's  medical aid scheme) and Aarogya Setu (India's disease status tracking app) is a major priority. Nidaan AI would automatically check user eligibility for free treatments, guide them on how to apply, recommend nearby hospitals, and provide a checklist of documents required , helping bridge the last-mile gap in public healthcare delivery.

## Conclusion

Nidaan AI began as an ambitious idea ,  to bring timely, trustworthy healthcare guidance to the remotest parts of India using the power of AI. What started with two students, a village visit, and a problem worth solving has now grown into a functional, multilingual health assistant capable of operating in low-resource settings.

This project taught us more than just AI :  it taught us resilience, empathy, and purpose. It was a roller coaster of emotions: from the verge of giving up during repeated failures, to the deep satisfaction of finally addressing early diagnosis in a village with no access to timely care, to the overwhelming support we received from the community. Every step reaffirmed why we started this  and how much more is possible when technology is built with heart.

We thank everyone who believed in us and stood by this mission , especially the people of Indral. We also want to express our deepest gratitude to the open-source developers at Google and the wider community working on models like Gemma. Without their incredible efforts, this project would never have been possible. 

We’re not done yet. Onward with the mission.

**— Team Nidaan AI**
