import { fetchAiFocusedNews } from './services/geminiService';

fetchAiFocusedNews().then(res => {
  console.log("Result:", JSON.stringify(res, null, 2));
}).catch(err => {
  console.error("Error:", err);
});
