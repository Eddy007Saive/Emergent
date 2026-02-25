"""
Backend Tests for Goodtime Diagnostic API
Tests: Root API, Diagnostic Analyze endpoint with OpenAI integration
"""
import pytest
import requests
import os

# Get the backend URL from environment - PUBLIC URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://goodtime-diagnostic.preview.emergentagent.com').rstrip('/')

class TestRootAPI:
    """Test the root API endpoint"""
    
    def test_api_root_returns_message(self):
        """Test that root API returns expected message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Goodtime Diagnostic API"
        print(f"✓ Root API: {data['message']}")


class TestDiagnosticAnalyze:
    """Test the /api/diagnostic/analyze endpoint with OpenAI integration"""
    
    @pytest.fixture
    def valid_payload(self):
        """Valid payload for diagnostic analysis"""
        return {
            "userInfo": {
                "firstName": "Test",
                "lastName": "User",
                "email": "test@example.com",
                "phone": "0612345678",
                "city": "Paris",
                "units": "15"
            },
            # All 22 questions answered with low scores (artisanal segment)
            "answers": {
                "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
                "6": 0, "7": 0, "8": 0, "9": 0, "10": 0,  # Structure: 0/20
                "11": 0, "12": 0, "13": 0, "14": 0, "15": 0,
                "16": 0, "17": 0, "18": 0, "19": 0,  # Acquisition: 0/18
                "20": 0, "21": 0, "22": 0  # Value: 0/6
            },
            "scores": {
                "total": 0,
                "structure": 0,
                "acquisition": 0,
                "value": 0
            }
        }
    
    @pytest.fixture
    def transition_payload(self):
        """Payload for transition segment (19-32 points)"""
        return {
            "userInfo": {
                "firstName": "Jean",
                "lastName": "Martin",
                "email": "jean@conciergerie.fr",
                "phone": "0698765432",
                "city": "Lyon",
                "units": "30"
            },
            # Mixed scores for transition segment
            "answers": {
                "1": 1, "2": 1, "3": 1, "4": 1, "5": 1,
                "6": 1, "7": 1, "8": 1, "9": 1, "10": 1,  # Structure: 10/20
                "11": 1, "12": 1, "13": 1, "14": 1, "15": 1,
                "16": 1, "17": 1, "18": 1, "19": 1,  # Acquisition: 9/18
                "20": 1, "21": 1, "22": 1  # Value: 3/6
            },
            "scores": {
                "total": 22,
                "structure": 10,
                "acquisition": 9,
                "value": 3
            }
        }
    
    @pytest.fixture
    def machine_payload(self):
        """Payload for machine segment (33-44 points)"""
        return {
            "userInfo": {
                "firstName": "Marie",
                "lastName": "Dupont",
                "email": "marie@topconciergerie.fr",
                "phone": "0678901234",
                "city": "Bordeaux",
                "units": "50"
            },
            # High scores for machine segment
            "answers": {
                "1": 2, "2": 2, "3": 2, "4": 2, "5": 2,
                "6": 2, "7": 2, "8": 2, "9": 2, "10": 2,  # Structure: 20/20
                "11": 2, "12": 2, "13": 2, "14": 2, "15": 2,
                "16": 2, "17": 2, "18": 2, "19": 2,  # Acquisition: 18/18
                "20": 2, "21": 2, "22": 2  # Value: 6/6
            },
            "scores": {
                "total": 44,
                "structure": 20,
                "acquisition": 18,
                "value": 6
            }
        }
    
    def test_analyze_diagnostic_artisanal_segment(self, valid_payload):
        """Test diagnostic analysis for artisanal segment (0-18 points)"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostic/analyze",
            json=valid_payload,
            headers={"Content-Type": "application/json"},
            timeout=60  # OpenAI might take time
        )
        
        # Status code check
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "firstName" in data
        assert "lastName" in data
        assert "email" in data
        assert "segment" in data
        assert "score" in data
        assert "diagSummary" in data
        assert "mainBlocker" in data
        assert "priority" in data
        assert "goodtimeRecommendation" in data
        
        # Verify user info is returned correctly
        assert data["firstName"] == "Test"
        assert data["lastName"] == "User"
        assert data["email"] == "test@example.com"
        
        # Verify segment is artisanal (score 0)
        assert data["segment"] == "artisanal", f"Expected 'artisanal', got '{data['segment']}'"
        assert data["score"] == 0
        
        # Verify analysis contains content (GPT generated or fallback)
        assert len(data["diagSummary"]) > 50, "diagSummary should contain substantial analysis"
        assert len(data["mainBlocker"]) > 0, "mainBlocker should not be empty"
        assert len(data["priority"]) > 0, "priority should not be empty"
        assert len(data["goodtimeRecommendation"]) > 50, "goodtimeRecommendation should be substantial"
        
        print(f"✓ Artisanal segment test passed:")
        print(f"  - Segment: {data['segment']}")
        print(f"  - Score: {data['score']}/44")
        print(f"  - Main Blocker: {data['mainBlocker'][:50]}...")
    
    def test_analyze_diagnostic_transition_segment(self, transition_payload):
        """Test diagnostic analysis for transition segment (19-32 points)"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostic/analyze",
            json=transition_payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify segment is transition
        assert data["segment"] == "transition", f"Expected 'transition', got '{data['segment']}'"
        assert data["score"] == 22
        assert data["structureScore"] == 10
        assert data["acquisitionScore"] == 9
        assert data["valueScore"] == 3
        
        # Verify detailed analysis sections are present
        assert "structureAnalysis" in data
        assert "acquisitionAnalysis" in data
        assert "valueAnalysis" in data
        assert "valorisation" in data
        assert "roadmap" in data
        
        # Verify structure analysis has expected fields
        if data.get("structureAnalysis"):
            struct = data["structureAnalysis"]
            assert "score" in struct
            assert "percentage" in struct
            assert "status" in struct
            assert "diagnostic" in struct
            assert "quickWins" in struct
        
        print(f"✓ Transition segment test passed:")
        print(f"  - Segment: {data['segment']}")
        print(f"  - Score: {data['score']}/44")
        print(f"  - Structure: {data['structureScore']}/20")
    
    def test_analyze_diagnostic_machine_segment(self, machine_payload):
        """Test diagnostic analysis for machine segment (33-44 points)"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostic/analyze",
            json=machine_payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify segment is machine
        assert data["segment"] == "machine", f"Expected 'machine', got '{data['segment']}'"
        assert data["score"] == 44
        
        # Verify valorisation estimates
        if data.get("valorisation"):
            val = data["valorisation"]
            assert "actuelle" in val
            assert "potentielle" in val
            assert "explication" in val
        
        # Verify roadmap structure
        if data.get("roadmap"):
            roadmap = data["roadmap"]
            assert "titre" in roadmap
            assert "phases" in roadmap
            assert len(roadmap["phases"]) >= 3  # Should have multiple phases
        
        print(f"✓ Machine segment test passed:")
        print(f"  - Segment: {data['segment']}")
        print(f"  - Score: {data['score']}/44")
        print(f"  - User: {data['firstName']} {data['lastName']}")
    
    def test_analyze_diagnostic_missing_fields(self):
        """Test diagnostic analysis with missing required fields"""
        incomplete_payload = {
            "userInfo": {
                "firstName": "Test"
                # Missing other required fields
            },
            "answers": {},
            "scores": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diagnostic/analyze",
            json=incomplete_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected 422 for invalid payload, got {response.status_code}"
        print(f"✓ Validation error test passed: {response.status_code}")
    
    def test_analyze_diagnostic_empty_payload(self):
        """Test diagnostic analysis with empty payload"""
        response = requests.post(
            f"{BASE_URL}/api/diagnostic/analyze",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected 422 for empty payload, got {response.status_code}"
        print(f"✓ Empty payload test passed: {response.status_code}")


class TestStatusEndpoint:
    """Test status check endpoints"""
    
    def test_create_status_check(self):
        """Test creating a status check"""
        payload = {"client_name": "TEST_diagnostic_client"}
        response = requests.post(
            f"{BASE_URL}/api/status",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_diagnostic_client"
        assert "timestamp" in data
        print(f"✓ Status check created: {data['id']}")
    
    def test_get_status_checks(self):
        """Test retrieving status checks"""
        response = requests.get(f"{BASE_URL}/api/status", timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} status checks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
