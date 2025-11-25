import { useState, useCallback, useRef, useEffect } from 'react'

interface UseTimelineViewportProps {
  songDuration: number
  defaultZoom?: number
}

interface ViewportState {
  zoom: number
  viewStartTime: number
  setZoom: (zoom: number | ((prev: number) => number)) => void
  setViewStartTime: (time: number | ((prev: number) => number)) => void
  timeToPixel: (time: number) => number
  pixelToTime: (pixel: number) => number
  handleWheel: (e: WheelEvent) => void
}

export function useTimelineViewport({ 
  songDuration, 
  defaultZoom = 100 
}: UseTimelineViewportProps): ViewportState {
  const [zoom, setZoomState] = useState(defaultZoom)
  const [viewStartTime, setViewStartTimeState] = useState(0)
  
  // Refs for event handlers to access current state without re-binding
  const stateRef = useRef({ zoom, viewStartTime, songDuration })
  
  useEffect(() => {
    stateRef.current = { zoom, viewStartTime, songDuration }
  }, [zoom, viewStartTime, songDuration])

  // Constrained Zoom Setter
  const setZoom = useCallback((newZoom: number | ((prev: number) => number)) => {
    setZoomState((prev) => {
      const value = typeof newZoom === 'function' ? newZoom(prev) : newZoom
      return Math.max(10, Math.min(2000, value)) // Clamp between 10 and 2000 px/s
    })
  }, [])

  // Constrained View Start Time Setter
  const setViewStartTime = useCallback((newTime: number | ((prev: number) => number)) => {
    setViewStartTimeState((prev) => {
      const value = typeof newTime === 'function' ? newTime(prev) : newTime
      // Constraint: NEVER less than 0, NEVER greater than songDuration
      return Math.max(0, Math.min(value, stateRef.current.songDuration))
    })
  }, [])

  // Convert time (seconds) to pixel position relative to view
  const timeToPixel = useCallback((time: number) => {
    return (time - viewStartTime) * zoom
  }, [viewStartTime, zoom])

  // Convert pixel position relative to view to time (seconds)
  const pixelToTime = useCallback((pixel: number) => {
    return (pixel / zoom) + viewStartTime
  }, [viewStartTime, zoom])

  // Wheel Event Handler Helper
  // Can be attached to a container to handle zoom and pan
  const handleWheel = useCallback((e: WheelEvent) => {
    const { zoom: currentZoom, viewStartTime: currentStart, songDuration: currentDuration } = stateRef.current

    // Check for Zoom gesture (Ctrl/Cmd + Wheel)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(10, Math.min(2000, currentZoom * delta))
      setZoomState(newZoom)
    } else {
      // Pan gesture (Horizontal scroll using wheel)
      // If we are hijacking vertical scroll for panning:
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal scroll is intentional
        const deltaX = e.deltaX || e.deltaY // Fallback to Y if Shift is held
        const timeDelta = deltaX / currentZoom
        const newStart = Math.max(0, Math.min(currentStart + timeDelta, currentDuration))
        setViewStartTimeState(newStart)
        // We might want to prevent default if we handled it
        if (Math.abs(deltaX) > 0) e.preventDefault()
      }
      // Else let vertical scroll happen naturally? 
      // The prompt says "updates these states while respecting the clamps".
      // If this is a viewport manager, typically it handles horizontal movement.
    }
  }, [])

  return {
    zoom,
    viewStartTime,
    setZoom,
    setViewStartTime,
    timeToPixel,
    pixelToTime,
    handleWheel
  }
}

