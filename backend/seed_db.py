import urllib.request
import json
import urllib.error

API_URL = "http://localhost:8000/api/workflows/"

tutorial_workflow = {
  "name": "Tutorial: Getting Started",
  "description": "Learn how to use FlowForge.",
  "workflow_json_data": {
    "nodes": [
      {
         "id": "t-1",
         "type": "tutorialNode",
         "position": {"x": 100, "y": 100},
         "data": {
             "title": "Welcome to FlowForge!", 
             "content": "FlowForge is a local, visual node-based automation platform.\n\n1. Use the 'Add Node' menu above.\n2. Drag from node to node to connect workflows.\n3. Click 'Execute' to run your graph locally!"
         }
      },
      {
         "id": "t-2",
         "type": "tutorialNode",
         "position": {"x": 500, "y": 100},
         "data": {
             "title": "Secure API Keys", 
             "content": "FlowForge isolates keys securely.\n\n1. Open the Side Panel (Chart Icon in top right).\n2. Add your API Keys natively (stored encrypted via SQLite + Fernet).\n3. Use them in an 'API Request' node dynamically via the dropdown!"
         }
      }
    ],
    "edges": [
       {"id": "e-1", "source": "t-1", "target": "t-2"}
    ]
  }
}

weather_workflow = {
  "name": "Demo: Weather Pipeline",
  "description": "Fetch weather data dynamically and process it locally.",
  "workflow_json_data": {
    "nodes": [
      {
         "id": "api-1",
         "type": "apiRequest",
         "position": {"x": 100, "y": 300},
         "data": {
             "label": "Get Weather (Berlin)", 
             "method": "GET", 
             "url": "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true", 
             "headers": "{}", 
             "status": "idle"
         }
      },
      {
         "id": "compute-1",
         "type": "localCompute",
         "position": {"x": 550, "y": 300},
         "data": {
             "label": "Process Result", 
             "device": "cpu", 
             "script": "import sys, json\n# Get output from upstream API node\nraw = sys.environ.get('FLOWFORGE_INPUT_API_1', '{}')\n\ntry:\n  data = json.loads(raw)\n  weather = data.get('current_weather', {})\n  temp = weather.get('temperature')\n  wind = weather.get('windspeed')\n  print(f\"SUCCESS: The weather is {temp}°C with {wind}km/h wind.\")\nexcept Exception as e:\n  print('Failed to parse:', e)", 
             "params": {}, 
             "status": "idle"
         }
      }
    ],
    "edges": [
       {"id": "e-2", "source": "api-1", "target": "compute-1"}
    ]
  }
}

def seed():
    try:
        req = urllib.request.Request(API_URL, data=json.dumps(tutorial_workflow).encode(), headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req) as response:
            print("Successfully inserted Tutorial workflow.")
            
        req2 = urllib.request.Request(API_URL, data=json.dumps(weather_workflow).encode(), headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req2) as response:
            print("Successfully inserted Weather Demo workflow.")
    except urllib.error.URLError as e:
        print(f"Failed to connect to backend: {e}")

if __name__ == "__main__":
    seed()
