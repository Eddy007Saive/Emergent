import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const analyzeDiagnostic = async (userInfo, answers, scores) => {
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  
  const payload = {
    userInfo: {
      firstName: userInfo.prenom,
      lastName: userInfo.nom,
      email: userInfo.email,
      phone: userInfo.telephone,
      city: userInfo.ville,
      units: String(userInfo.nombreLogements || ''),
    },
    answers: Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [String(k), v])
    ),
    scores,
  };
  
  console.log('Sending to API:', API_URL, payload);
  
  try {
    const response = await axios.post(`${API_URL}/api/diagnostic/analyze`, payload);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error analyzing diagnostic:', error.response?.data || error.message);
    throw error;
  }
};
