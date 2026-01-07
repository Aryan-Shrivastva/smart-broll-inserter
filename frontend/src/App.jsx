import { useState } from 'react'
import './App.css'

function App() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const [arollFile, setArollFile] = useState(null)
  const [brollFiles, setBrollFiles] = useState([])

  const handleArollChange = (event) => {
    const file = event.target.files?.[0] || null
    setArollFile(file)
  }

  const handleBrollChange = (event) => {
    const files = Array.from(event.target.files || [])
    setBrollFiles(files)
  }

  const callApiAndSetPlan = async (requestPromise) => {
    setLoading(true)
    setError(null)
    setPlan(null)

    try {
      const response = await requestPromise
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

  const generateFromUpload = async () => {
    if (!arollFile) {
      setError('Please upload an A-roll video to use this option, or use the demo video button below.')
      return
    }

    const formData = new FormData()
    formData.append('aroll', arollFile)
    brollFiles.forEach((file) => {
      formData.append('brolls', file)
    })

    await callApiAndSetPlan(
      fetch('http://localhost:4000/api/plan/upload', {
        method: 'POST',
        body: formData,
      })
    )
  }

  const generateFromDemo = async () => {
    await callApiAndSetPlan(
      fetch('http://localhost:4000/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    )
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
          <div className="upload-section">
            <h2>Upload Your Clips </h2>
            <p className="upload-help">
              Upload an A-roll video and optional B-roll clips. Use the button below to
              generate a plan from your uploads. If you prefer, you can ignore this and
              use the built-in demo video instead.
            </p>

            <div className="upload-field">
              <label htmlFor="aroll-input">A-roll video</label>
              <input
                id="aroll-input"
                type="file"
                accept="video/*"
                onChange={handleArollChange}
              />
              {arollFile && <p className="file-name">Selected: {arollFile.name}</p>}
            </div>

            <div className="upload-field">
              <label htmlFor="broll-input">B-roll clips (optional, multiple)</label>
              <input
                id="broll-input"
                type="file"
                accept="video/*"
                multiple
                onChange={handleBrollChange}
              />
              {brollFiles.length > 0 && (
                <p className="file-name">
                  Selected B-rolls: {brollFiles.map((f) => f.name).join(', ')}
                </p>
              )}
            </div>

            <div className="controls-button">
              <button 
                onClick={generateFromUpload} 
                disabled={loading}
                className="generate-btn"
              >
                {loading ? 'Generating from Upload...' : 'Generate from Upload'}
              </button>
            </div>
          </div>

          <div className="demo-section">
            <h2>Or Use Demo Video</h2>
            <p className="upload-help">
              Click below to generate a plan using the provided demo A-roll and B-roll
              clips.
            </p>
            <div className="controls-button">
              <button 
                onClick={generateFromDemo} 
                disabled={loading}
                className="generate-btn secondary"
              >
                {loading ? 'Generating from Demo...' : 'Generate from Demo'}
              </button>
            </div>
          </div>
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
