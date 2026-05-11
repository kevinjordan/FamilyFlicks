import { useState } from 'react'
import { useApp } from '../context/AppContext'
import StepChildCount from '../components/onboarding/StepChildCount'
import StepChildDetail from '../components/onboarding/StepChildDetail'
import StepSiblingDefault from '../components/onboarding/StepSiblingDefault'
import StepPreferences from '../components/onboarding/StepPreferences'
import StepDecade from '../components/onboarding/StepDecade'
import StepStreaming from '../components/onboarding/StepStreaming'

function buildSteps(childCount) {
  const steps = ['childCount']
  for (let i = 0; i < childCount; i++) steps.push(`child_${i}`)
  if (childCount > 1) steps.push('siblingDefault')
  steps.push('preferences', 'decade', 'streaming')
  return steps
}

function initChildren(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `child_${i + 1}`,
    maxCert: 'PG',
    nudgeEnabled: false,
  }))
}

export default function OnboardingScreen() {
  const { completeOnboarding } = useApp()
  const [stepIndex, setStepIndex] = useState(0)

  const [childCount, setChildCount] = useState(1)
  const [children, setChildren] = useState(initChildren(1))
  const [childAges, setChildAges] = useState({ 0: 10 })
  const [siblingDefault, setSiblingDefault] = useState('youngest')
  const [language, setLanguage] = useState('en')
  const [subtitles, setSubtitles] = useState(false)
  const [includeAnimation, setIncludeAnimation] = useState(true)
  const [decadeFrom, setDecadeFrom] = useState(1990)
  const [streamingServices, setStreamingServices] = useState([])

  const steps = buildSteps(childCount)
  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  const childIndex = currentStep?.startsWith('child_')
    ? parseInt(currentStep.split('_')[1], 10)
    : null

  function handleChildCountChange(count) {
    setChildCount(count)
    setChildren(prev => {
      const next = [...prev]
      while (next.length < count) {
        next.push({ id: `child_${next.length + 1}`, maxCert: 'PG', nudgeEnabled: false })
      }
      return next.slice(0, count)
    })
  }

  function handleChildChange(i, data) {
    setChildren(prev => prev.map((c, idx) => (idx === i ? data : c)))
  }

  function goNext() {
    if (!isLastStep) {
      setStepIndex(s => s + 1)
    } else {
      completeOnboarding({
        siblingDefault: childCount === 1 ? 'youngest' : siblingDefault,
        language,
        subtitles,
        includeAnimation,
        decadeFrom,
        streamingServices,
        children,
      })
    }
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex(s => s - 1)
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pb-6" style={{ background: 'var(--color-bg)' }}>
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 pt-10 pb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          🎬
        </div>
        <h1 className="text-2xl font-bold text-white">FamilyFlicks</h1>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center items-center gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === stepIndex ? 24 : 8,
              height: 8,
              background: i <= stepIndex ? '#6366f1' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {currentStep === 'childCount' && (
          <StepChildCount value={childCount} onChange={handleChildCountChange} />
        )}

        {childIndex !== null && (
          <StepChildDetail
            childIndex={childIndex}
            value={children[childIndex]}
            age={childAges[childIndex] ?? 10}
            onAgeChange={age => setChildAges(prev => ({ ...prev, [childIndex]: age }))}
            onChange={data => handleChildChange(childIndex, data)}
          />
        )}

        {currentStep === 'siblingDefault' && (
          <StepSiblingDefault value={siblingDefault} onChange={setSiblingDefault} />
        )}

        {currentStep === 'preferences' && (
          <StepPreferences
            language={language}
            subtitles={subtitles}
            includeAnimation={includeAnimation}
            onLanguage={setLanguage}
            onSubtitles={setSubtitles}
            onAnimation={setIncludeAnimation}
          />
        )}

        {currentStep === 'decade' && (
          <StepDecade value={decadeFrom} onChange={setDecadeFrom} />
        )}

        {currentStep === 'streaming' && (
          <StepStreaming value={streamingServices} onChange={setStreamingServices} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-6">
        {stepIndex > 0 && (
          <button
            onClick={goBack}
            className="flex-1 py-4 rounded-2xl font-semibold text-base"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: '#94a3b8',
            }}
          >
            ← Back
          </button>
        )}
        <button
          onClick={goNext}
          className="flex-1 py-4 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90 active:opacity-75"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {isLastStep ? 'Finish setup →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
