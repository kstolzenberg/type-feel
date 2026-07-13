# type-feel

what if we could see the shape of our feelings, the ebbs and flows of our moods, more clearly?

building a new type of mood journal. more visual, more scannable for reflecting at a later time. dynamically mapping emotions to variable text using the [circumplex model](https://en.wikipedia.org/wiki/Emotion_classification#Circumplex_model).

## the circumplex model
two axes: positive/negative arousal = "intensity", positive/negative valance = "pleasantness"
<img width="600px" height="auto" alt="image" src="https://github.com/user-attachments/assets/8b1e1e59-2bde-4f65-bb0c-423e1673694f" />

## technical approach
1. I selected a multi-axis, variable font: [Google Sans Flex](https://fonts.google.com/specimen/Google+Sans+Flex?preview.script=Latn)
2. I mapped the font axes to emotional axes:
   - High intensity &rarr; low width, tight spacing, narrow
   - High pleasantness &rarr; heavier weight && larger size, bolder presence, more excitement   
5. I chose the User Input: voice input for low friction expression, capture free rambling thoughts
6. Claude recommended a Classifier: [NRC-VAD lexicon](https://arxiv.org/abs/2503.23547) for a emotion classifier, defer LLM service complexity
7. Claude recommended Privacy-aware Storage: local storage, defer user accounts and cloud storage complexity
8. I created an option for data portability, download, export
9. Claude wrote the requirements, HTML and Javascript.
10. I polished the UI, focused the information hierarchy, and directed an option for horizontal timeline visualization. 

## outcome
<img width="2062" height="1280" alt="Screenshot 2026-07-10 at 4 46 11 PM" src="https://github.com/user-attachments/assets/b9c60c8e-b19e-4095-a9fe-8ee140e619d6" />

## future steps
- upgrade classifier to an LLM API for wider coverage, greater nuance
- add option for more visual expression, dynamic colors, dyanamic shader backgrounds based on emotional axes as well
