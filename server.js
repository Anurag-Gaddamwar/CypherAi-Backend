const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
app.use(express.json());
app.use(cors({
  origin: ['https://cypher-ai.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

const upload = multer({ dest: 'uploads/' });

app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    let fileContent = '';
    let jobRole = req.body.jobRole || '';

    if (req.file.mimetype === 'application/pdf') {
      // Handle PDF files
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Only PDF files are allowed.' });
    }

    // Clean up uploaded file
    await fs.unlinkSync(req.file.path);

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `This is my resume: "${fileContent}". I am aiming for the job role "${jobRole}".
    Please analyze this resume in the context of the specified job role, providing both individual metrics and a comprehensive assessment of its strengths and weaknesses. Also I have seen that you are always giving the score between 80-90, even if the resume doesn't actually align with the specified job role, which makes it hard to believe the score, so analyze very critically and then give me the scores; the scores may be less, doesn't matter, but they should be genuine.  
    
    Assessment Criteria:
    
    1. ATS Compatibility:
        - Assess the resume's adherence to ATS standards, including keyword optimization, formatting, and structure.
        
    2. Content and Relevance:
        - Evaluate the alignment between the resume's content (skills, experience, education) and the requirements of the job role.
    
    3. Structure and Formatting:
        - Assess the overall organization and readability of the resume along with the clarity and conciseness of section headings and bullet points.
    
    4. Strengths:
        - Highlight the resume's most compelling aspects that align with the job requirements (e.g., quantifiable achievements, relevant skills, strong experience).
        - Emphasize skills and experiences that directly relate to the job role. Showcase any expertise or knowledge areas that are crucial for the position, including any special projects or responsibilities that align with the job’s demands.
    
    5. Areas of Improvement:
        - Assess how well the resume matches the job description. Identify any missing skills, experiences, or qualifications that are important for the role and suggest ways to better align the resume with these requirements.
        - Provide targeted advice on how to improve the resume. This could include suggestions for rephrasing, adding specific details, or highlighting particular experiences or skills to make the resume more appealing to recruiters for the target job. (Remember that you can consider giving suggestions about the formatting and structure of the resume, but since you only receive the text response hence, the actual formatting and spacing can't be maintained here)
    
    Output Format:
    
    ATS Compatibility Score (in %): Provide an estimated score based on the resume's ATS-friendliness. The score should be between 0 to 80. (provide only score)
    Content Relevance Score (in %): Rate the resume's alignment with the target job role. The score should be between 0 to 90. (provide only score)
    Structure and Formatting Score (in %): Assess the resume's organization and readability. The score should be between 0 to 90. (provide only score)
    Strengths: (4 points) List the resume's top strengths, with specific examples from the resume.
    Areas for Improvement: (4 points) List areas for improvement, offering actionable suggestions for each and mention the specific area where there are grammatical errors or any sort of faults if any.
    
    {imp note] - Check properly if the content does not appear to be a resume, and please indicate this in the output. Ensure the analysis is comprehensive, actionable, and tailored to the specific job role provided and output must only have these things: 3 scores, strengths and area of improvement.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    console.log(text);
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});


app.post('/generate-content', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const { currentQuery, prevConversation } = req.body;
    const prompt = `You are CypherAI, an advanced interview preparation assistant. Your role is to engage in natural, conversational interactions with users who are preparing for job interviews.
    Analyze the user's input carefully. Determine their intent:
    * **Greeting:** If the user simply greets you ("Hello," "Hi there," etc.), respond with a friendly greeting in return, but avoid mentioning interview-related topics.
    * **Direct Question:** If the user asks a question about the interview process, specific questions, or preparation strategies, provide a clear, concise, and helpful answer based on your knowledge.
    * **Vague Statement or Request:** If the user's input is unclear or too broad, gently guide them towards asking a specific question that you can address.
    * **Off-Topic:** If the user's input is unrelated to interview preparation, politely answer them and you can also go off-topic as per the user demands and requirements, but for only educational and emotional support.
    * **Commonly Asked Questions (interpersonal and technical):** If the user asks for commonly asked interview questions then reply back to the user with the commonly asked interpersonal questions or technical questions as asked by the user.
    Always maintain a professional, supportive, and encouraging tone. Aim to boost the user's confidence and help them feel well-prepared for their interview.
    **Additional Considerations:**
    * **Personalization:** If possible, consider ways to personalize your responses based on the user's specific job field or experience level.
    * **Data Collection:** If applicable, you can collect data on common user questions or pain points to improve the assistant's responses over time.
    * **Integration with Resources:** If your project allows, integrate links to relevant articles, videos, or practice tools to provide additional support.
    **Conversation History:**
    
    Previous Conversation: "${prevConversation}"
    **Current Query:**
    
    "${currentQuery}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

app.post('/generate-roadmap', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const { currentQuery } = req.body;

    const prompt = `
  You are CypherAI, an advanced interview preparation assistant. Create a comprehensive learning roadmap for a fresher aiming for the job role specified below. The roadmap should start with foundational skills and progress to advanced topics (still basic since it's for a just passout B.Tech graduate), with realistic timelines for achieving intermediate proficiency. Ensure the learning path is structured and covers all essential skills and tools for the role.
  **Job Role:** "${currentQuery}"
  **Response Format:**
  1. **Skill 1:** [Number of days]
  2. **Skill 2:** [Number of days]
  3. **Skill 3:** [Number of days]
  4. **Skill 4:** [Number of days]
  5. **Skill 5:** [Number of days]
  ...
  Allocate days based on typical learning requirements, ensuring the roadmap covers all key areas from basics to advanced skills relevant to the job role. Provide only the skills and the number of days required for each.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = await response.text();

    // Remove unnecessary characters like '**' and trim lines
    text = text
      .split('\n') // Split text into lines
      .map(line => line.replace(/\*\*/g, '').trim()) // Remove '**' and trim whitespace
      .join('\n'); // Join lines back into a single string

    console.log(text);
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});



app.post('/conduct-interview', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    let fileContent = '';
    let jobRole = '';
    let interviewType = '';

    // Extract values from request body
    if (req.body.jobRole) {
      jobRole = req.body.jobRole;
    }
    if (req.body.interviewType) {
      interviewType = req.body.interviewType;
    }

    if (req.file.mimetype === 'application/pdf') {
      // Extract text from PDF
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else if (['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
      // Extract text from image using OCR
      const result = await recognize(req.file.path, 'eng');
      fileContent = result.data.text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // Generate content using GEMINI API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const prompt = `
      You are conducting an interview. You have to provide 2 relevant questions based on the interview type (HR or Technical).

      Here is the candidate's resume and job role:

      Resume: ${fileContent}
      Job Role: ${jobRole}
      Interview Type: ${interviewType === "Both" ? "HR plus Technical" : interviewType} Interview

      Your task is to:
      Provide 2 relevant basic but frequently asked important fresher level interview questions based on the job role. Don't provide even a single word extra other than the questions, not even a heading, strictly follow the output format. Remember the first question is most likely "Tell me something about yourself" in almost all interviews.

      Output Format: 
      - 2 interview questions
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Assuming the response content is a single string
    const text = response.text(); // Get the string content from the response
    console.log(text);
    res.send(text); // Send plain text response
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

app.post('/get-feedback', async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ error: 'No answers provided.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Construct the prompt for feedback generation
    const prompt = `
    You are an interviewer tasked with evaluating a candidate's responses to interview questions. Make sure you give 0 if the answers are completely irrelevant or if the user is just propmting back the questions only. But make sure to evaluate softly since the candidate is a fresher

    Here are the interview questions and the candidate's answers:

    ${Object.entries(answers).map(([question, answer]) => `Question: ${question}\nAnswer: ${answer}`).join('\n\n')}

    Your task is to:
    - Provide a **Comprehensive Performance Assessment** with the following metrics:
        **Quality:** (out of 10)
        **Clarity:** (out of 10)
        **Relevance:** (out of 10)
    - Deliver a succinct, professional **Performance Summary** that highlights key observations and overall impressions.
    - Recommend **Actionable Steps for Improvement** that address specific areas for development and enhance the candidate’s interview skills.

    The feedback must be thorough, professional, and actionable, incorporating both qualitative insights and quantitative scores.

    Strictly follow this format for the response:

    **Comprehensive Performance Assessment:**
    - **Quality:** x/10 {include only scores}
    - **Clarity:** y/10 {include only scores}
    - **Relevance:** z/10 {include only scores}

    **Performance Summary:** 
    Give 3 line description on how the candidate performed.

    **Actionable Steps for Improvement:**
    1. [Specific Suggestion 1]
    2. [Specific Suggestion 2]
    3. [Specific Suggestion 3]
    [Include additional suggestions if applicable.]

    **Interview Result:** 
    If selected: Yes
    If not selected: No
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Assuming the response content is a string that needs to be parsed
    const feedbackText = response.text();
    console.log("\n\nActual response from GEMINI:\n");
    console.log(feedbackText);

    // Parsing the feedback
    const feedback = parseFeedback(feedbackText);
    console.log("\n\nWhat we have parsed and stored in the feedback object:\n")
    console.log(feedback);

    res.send({ feedback }); // Send structured feedback as JSON
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({ error: 'Error generating feedback' });
  }
});


function parseFeedback(feedbackText) {
  const feedback = {};

  // Clean the feedback text to remove unwanted characters like *, #, etc.
  const cleanedText = feedbackText.replace(/[*#]/g, '').trim();

  // Extracting scores for Quality, Clarity, and Relevance
  const scoreMatch = cleanedText.match(/Quality:\s*(\d+)\/10[\s\S]*?Clarity:\s*(\d+)\/10[\s\S]*?Relevance:\s*(\d+)\/10/);

  if (scoreMatch) {
    feedback.quality = parseInt(scoreMatch[1], 10);
    feedback.clarity = parseInt(scoreMatch[2], 10);
    feedback.relevance = parseInt(scoreMatch[3], 10);
  }

  // Extracting Performance Summary
  const summaryMatch = cleanedText.match(/Performance Summary:\s*([^]+?)\n\nActionable Steps for Improvement:/s);
  if (summaryMatch) {
    feedback.performanceSummary = summaryMatch[1].trim();
  }

  // Extracting Recommendations
  const recommendationsMatch = cleanedText.match(/Actionable Steps for Improvement:\s*([^]+?)\n\nInterview Result:/s);
  if (recommendationsMatch) {
    feedback.recommendations = recommendationsMatch[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.match(/^\d+\.\s*/)) // Ensures only numbered suggestions are included
      .map((line) => line.replace(/^\d+\.\s*/, '')); // Removes the numbering
  }

  // Extracting Interview Result
  const resultMatch = cleanedText.match(/Interview Result:\s*(Yes|No)/);
  if (resultMatch) {
    feedback.interviewResult = resultMatch[1];
  }

  return feedback;
}






// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
