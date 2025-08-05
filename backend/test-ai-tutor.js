// Simple test script to verify AI tutor endpoint
// Using built-in fetch (Node.js 18+)

async function testAiTutor() {
  try {
    console.log('Testing AI Tutor endpoint...');
    
    const response = await fetch('http://localhost:3001/api/trigger-ai-tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfName: 'Doubly Linked List Algorithm ACS 106'
      }),
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success response:', data);
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testAiTutor();