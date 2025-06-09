const { Server } = require('socket.io')

const io = new Server(3001, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id)

  // 객체 추가
  socket.on('object:add', (data) => {
    socket.broadcast.emit('object:add', data)
  })

  // 객체 수정 (위치, 크기 등)
  socket.on('object:modified', (data) => {
    socket.broadcast.emit('object:modified', data)
  })

  // 객체 삭제
  socket.on('object:removed', (data) => {
    socket.broadcast.emit('object:removed', data)
  })

  socket.on('canvas:pan', (transform) => {
    socket.broadcast.emit('canvas:pan', transform)
  })

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id)
  })
})

console.log('🚀 Socket.IO server running at http://localhost:3001')
