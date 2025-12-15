import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const analyzeDiagnostic = async (userInfo, answers, scores) => {
  try {
    const response = await axios.post(`${API_URL}/api/diagnostic/analyze`, {
      userInfo: {
        firstName: userInfo.prenom,
        lastName: userInfo.nom,
        email: userInfo.email,
        phone: userInfo.telephone,
        city: userInfo.ville,
        units: userInfo.nombreLogements,
      },
      answers,
      scores,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing diagnostic:', error);
    throw error;
  }
};
