import { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'
import { io, Socket } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import './CanvasSection.css'
import jsPDF from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker'

pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker()

const CanvasSection = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activeTool, setActiveTool] = useState<'select' | 'pen' | 'hand' | 'eraser'>('select')
  const [penColor, setPenColor] = useState('#000000')
  const [penWidth, setPenWidth] = useState(5)
  const [eraserWidth, setEraserWidth] = useState(20)

  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const username = useRef(`User_${Math.floor(Math.random() * 1000)}`)

  const sendMessage = () => {
  if (chatInput.trim() === '' || !socket) return
  const newMessage = { sender: username.current, message: chatInput }
  socket.emit('chat:message', newMessage)
  setChatMessages((prev) => [...prev, newMessage])
  setChatInput('')
}
  useEffect(() => {
  if (!socket) return
  const receiveMessage = (data: { sender: string; message: string }) => {
    setChatMessages((prev) => [...prev, data])
  }
  socket.on('chat:message', receiveMessage)
  return () => {
    socket.off('chat:message', receiveMessage)
  }
}, [socket])



  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)

  const startRecording = () => {
  const canvasEl = canvasRef.current
  if (!canvasEl) return

  const stream = canvasEl.captureStream(30) // FPS 설정
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })

  const chunks: Blob[] = []

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  mediaRecorder.onstop = () => {
    if (chunks.length === 0) {
      console.error('❌ 녹화된 데이터가 없습니다.')
      return
    }
    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'canvas-recording.webm'
    a.click()
    URL.revokeObjectURL(url)
    setRecordedChunks([])
  }

  setRecordedChunks([])
  setMediaRecorder(mediaRecorder)
  setIsRecording(true)
  mediaRecorder.start()

  // 렌더링 트리거 (캔버스가 멈춰 있으면 스트림이 생성되지 않음)
  const animate = () => {
    if (!canvas) return
    canvas.renderAll()
    requestAnimationFrame(animate)
  }
  animate()
  
}

const stopRecording = () => {
  mediaRecorder?.stop()
  setIsRecording(false)
}

  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(0)

  const renderPdfPage = async (pageNumber: number) => {
    if (!canvas || !pdfDoc) return
    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 2 })

    const tempCanvas = document.createElement('canvas')
    const context = tempCanvas.getContext('2d')!
    tempCanvas.width = viewport.width
    tempCanvas.height = viewport.height

    await page.render({ canvasContext: context, viewport }).promise

    const dataUrl = tempCanvas.toDataURL()

  fabric.Image.fromURL(dataUrl, (fabricImg) => {
    if (!fabricImg || !canvas) return

    // 기존 PDF 배경 삭제
    canvas.getObjects().forEach(obj => {
      if ((obj as any).isPdfPage) canvas.remove(obj)
    })

    fabricImg.set({
      left: 0,
      top: 0,
      selectable: false,
    })
    ;(fabricImg as any).isPdfPage = true

    canvas.add(fabricImg)
    canvas.sendToBack(fabricImg)
    canvas.requestRenderAll()
  }, { crossOrigin: 'anonymous' }) // CORS 오류 방지 (안전)
}

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return
    const file = event.target.files[0]
    const fileReader = new FileReader()
    fileReader.onload = async () => {
      try {
        const typedarray = new Uint8Array(fileReader.result as ArrayBuffer)
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise

        setPdfDoc(pdf)
        setNumPages(pdf.numPages)
        setCurrentPage(1)
      } catch (err) {
        console.error('PDF 불러오기 오류:', err)
      }
    }
    fileReader.readAsArrayBuffer(file)
  }

  useEffect(() => {
  if (canvas && pdfDoc && currentPage > 0) {
    renderPdfPage(currentPage)
  }
}, [canvas, pdfDoc, currentPage])

  const goToPrevPage = async () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      await renderPdfPage(newPage)
    }
  }

  const goToNextPage = async () => {
    if (pdfDoc && currentPage < numPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      await renderPdfPage(newPage)
    }
  }

  useEffect(() => {
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)
    return () => {
      newSocket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const newCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
      backgroundColor: '#ffffff',
    })
    setCanvas(newCanvas)

    newCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY
      let zoom = newCanvas.getZoom() * 0.999 ** delta
      zoom = Math.min(Math.max(zoom, 0.1), 20)
      newCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    const handleResize = () => {
      newCanvas.setDimensions({
        width: containerRef.current!.offsetWidth,
        height: containerRef.current!.offsetHeight,
      })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      newCanvas.dispose()
    }
  }, [])

  useEffect(() => {
    if (!canvas) return

    canvas.off('mouse:down')
    canvas.off('mouse:move')
    canvas.off('mouse:up')

    if (activeTool === 'pen') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = penColor
      canvas.freeDrawingBrush.width = penWidth
      canvas.selection = false
      canvas.defaultCursor = 'crosshair'
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = '#ffffff'
      canvas.freeDrawingBrush.width = eraserWidth
      canvas.selection = false
      canvas.defaultCursor = 'cell'
    } else if (activeTool === 'select') {
      canvas.isDrawingMode = false
      canvas.selection = true
      canvas.defaultCursor = 'default'
    } else if (activeTool === 'hand') {
      canvas.isDrawingMode = false
      canvas.selection = false
      canvas.defaultCursor = 'move'
      let panning = false

      canvas.on('mouse:down', () => (panning = true))
      canvas.on('mouse:move', (event) => {
        if (panning) {
          const delta = new fabric.Point(event.e.movementX, event.e.movementY)
          canvas.relativePan(delta)
          if (socket && canvas.viewportTransform)
            socket.emit('canvas:pan', canvas.viewportTransform)
        }
      })
      canvas.on('mouse:up', () => (panning = false))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
        const activeObjects = canvas.getActiveObjects()
        if (activeObjects.length) {
          activeObjects.forEach((obj) => {
            canvas.remove(obj)
            socket?.emit('object:removed', obj.toObject(['id']))
          })
          canvas.discardActiveObject()
          canvas.requestRenderAll()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, canvas, penColor, penWidth, eraserWidth, socket])

  useEffect(() => {
    if (!canvas || !socket) return

    const handleAdd = (e: fabric.IEvent) => {
      const obj = e.target
      if (!obj || (obj as any)._synced) return
      const id = uuidv4()
      ;(obj as any).id = id
      const json = obj.toObject(['id'])
      socket.emit('object:add', json)
    }

    canvas.on('object:added', handleAdd)
    return () => {
      canvas.off('object:added', handleAdd)
    }
  }, [canvas, socket])

  useEffect(() => {
    if (!canvas || !socket) return

    const handleModify = (e: fabric.IEvent) => {
      const obj = e.target
      if (!obj) return
      const id = (obj as any).id
      if (!id) return
      const json = obj.toObject(['id'])
      socket.emit('object:modified', json)
    }

    canvas.on('object:modified', handleModify)
    return () => {
      canvas.off('object:modified', handleModify)
    }
  }, [canvas, socket])

  useEffect(() => {
    if (!canvas || !socket) return

    const handleAdd = (data: any) => {
      fabric.util.enlivenObjects([
        data
      ], (objects: fabric.Object[]) => {
        objects.forEach((obj) => {
          (obj as any)._synced = true
          canvas.add(obj)
        })
        canvas.requestRenderAll()
      }, '', )
    }

    socket.on('object:add', handleAdd)
    return () => {
      socket.off('object:add', handleAdd)
    }
  }, [canvas, socket])

  useEffect(() => {
    if (!canvas || !socket) return

    const handleModify = (data: any) => {
      const target = canvas.getObjects().find((o: any) => o.id === data.id)
      if (target) {
        target.set(data)
        target.setCoords()
        canvas.requestRenderAll()
      }
    }

    socket.on('object:modified', handleModify)
    return () => {
      socket.off('object:modified', handleModify)
    }
  }, [canvas, socket])

  useEffect(() => {
    if (!canvas || !socket) return

    const handleRemove = (data: any) => {
      const target = canvas.getObjects().find((o: any) => o.id === data.id)
      if (target) {
        canvas.remove(target)
        canvas.requestRenderAll()
      }
    }

    socket.on('object:removed', handleRemove)
    return () => {
      socket.off('object:removed', handleRemove)
    }
  }, [canvas, socket])

  useEffect(() => {
    if (!canvas || !socket) return

    const handlePan = (transform: number[]) => {
      canvas.setViewportTransform(transform)
      canvas.requestRenderAll()
    }

    socket.on('canvas:pan', handlePan)
    return () => {
      socket.off('canvas:pan', handlePan)
    }
  }, [canvas, socket])

  const exportToPDF = () => {
    if (!canvas) return
    const dataURL = canvas.toDataURL({ format: 'png' })
    const pdf = new jsPDF('landscape', 'pt', [canvas.getWidth(), canvas.getHeight()])
    pdf.addImage(dataURL, 'PNG', 0, 0, canvas.getWidth(), canvas.getHeight())
    pdf.save('whiteboard.pdf')
  }

  const exportToPNG = () => {
  if (!canvas) return
  const dataURL = canvas.toDataURL({ format: 'png' })
  const link = document.createElement('a')
  link.href = dataURL
  link.download = 'whiteboard.png'
  link.click()
}
  
  

  return (
    
    <div className="canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} />
      <div className="tool-bar">
        <button onClick={() => setActiveTool('select')} disabled={activeTool === 'select'}>선택</button>
        <button onClick={() => setActiveTool('pen')} disabled={activeTool === 'pen'}>펜</button>
        <button onClick={() => setActiveTool('eraser')} disabled={activeTool === 'eraser'}>지우개</button>
        <button onClick={() => setActiveTool('hand')} disabled={activeTool === 'hand'}>손</button>
        <button onClick={exportToPDF}>📄 PDF로 저장</button>
        <button onClick={exportToPNG}>🖼 PNG로 저장</button>
        <button onClick={isRecording ? stopRecording : startRecording}>
  {isRecording ? '⏹ 녹화 중지' : '🎥 녹화 시작'}
</button>
        <label style={{ display: 'inline-block' }}>
          📂 PDF 불러오기
          <input type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
        </label>
        {pdfDoc && (
          <span style={{ marginLeft: 10 }}>
            <button onClick={goToPrevPage} disabled={currentPage === 1}>⬅️</button>
            <span style={{ margin: '0 6px' }}>{currentPage} / {numPages}</span>
            <button onClick={goToNextPage} disabled={currentPage === numPages}>➡️</button>
          </span>
        )}
        {activeTool === 'pen' && (
          <>
            <label>색상: </label>
            <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
            <label>굵기: </label>
            <input type="range" min="1" max="50" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} />
          </>
        )}
        {activeTool === 'eraser' && (
          <>
            <label>지우개 굵기: </label>
            <input type="range" min="5" max="100" value={eraserWidth} onChange={(e) => setEraserWidth(Number(e.target.value))} />
          </>
        )}
      </div>
      <div className="chat-container">
  <div className="chat-messages">
    {chatMessages.map((msg, idx) => (
      <div key={idx}>
        <strong>{msg.sender}:</strong> {msg.message}
      </div>
    ))}
  </div>
  <div className="chat-input">
    <input
      type="text"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      placeholder="메시지 입력..."
    />
    <button onClick={sendMessage}>전송</button>
  </div>
</div>

    </div>

    
  )
}

export default CanvasSection
