import { useState } from 'react'
import './App.css'

function App() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)

  const generatePlan = async () => {
    setLoading(true)
    setError(null)
    setPlan(null)

    try {
      const response = await fetch('http://localhost:4000/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate plan: ${response.statusText}`)
      }

      const data = await response.json()
      setPlan(data)
    } catch (err) {
      setError(err.message)
      console.error('Error generating plan:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins}:${secs.padStart(4, '0')}`
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Smart B-Roll Inserter</h1>
        <p>Automatically plan B-roll insertions for your A-roll video</p>
      </header>

      <main className="main">
        <div className="controls">
          <button 
            onClick={generatePlan} 
            disabled={loading}
            className="generate-btn"
          >
            {loading ? 'Generating Plan...' : 'Generate Plan'}
          </button>
        </div>

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {plan && (
          <div className="plan-results">
            <div className="info-section">
              <h2>Video Info</h2>
              <p><strong>Duration:</strong> {formatTime(plan.aroll_duration_sec)}</p>
            </div>

            <div className="transcript-section">
              <h2>Transcript</h2>
              <div className="transcript-list">
                {plan.transcript_segments.map((segment, index) => (
                  <div key={index} className="transcript-item">
                    <span className="timestamp">
                      {formatTime(segment.start_sec)} - {formatTime(segment.end_sec)}
                    </span>
                    <span className="text">{segment.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="insertions-section">
              <h2>B-Roll Insertions ({plan.insertions.length})</h2>
              {plan.insertions.length === 0 ? (
                <p className="no-insertions">No insertions planned.</p>
              ) : (
                <div className="insertions-list">
                  {plan.insertions.map((insertion, index) => (
                    <div key={index} className="insertion-item">
                      <div className="insertion-header">
                        <span className="insertion-time">
                          {formatTime(insertion.start_sec)} ({insertion.duration_sec}s)
                        </span>
                        <span className="insertion-id">{insertion.broll_id}</span>
                        <span className="insertion-confidence">
                          Confidence: {(insertion.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="insertion-reason">{insertion.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
