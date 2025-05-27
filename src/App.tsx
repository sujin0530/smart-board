import { Tldraw, track, useEditor, TLShapeId, Editor} from 'tldraw'
import 'tldraw/tldraw.css'
import { useYjsStore } from './useYjsStore'
import { useState, useEffect } from 'react' // 반드시 import 필요
import { useUserRoleStore } from './useUserRoleStore'



const HOST_URL =
  import.meta.env.MODE === 'development'
    ? 'ws://localhost:1234'
    : 'wss://demos.yjs.dev'

export default function YjsExample() {

  const store = useYjsStore({
    roomId: 'example17',
    hostUrl: HOST_URL,
  })

  return (
    <div className="tldraw__editor">
      <Tldraw
        autoFocus
        store={store}
        onMount={(editor)=>{
          useUserRoleStore.getState().setRole('guest')

          const{color}=editor.user.getUserPreferences()
          console.log('현재 사용자 색상:', color)
          

      

        }}
        components={{
          SharePanel: NameEditor,
        }}
      />
    </div>
  )
}

const NameEditor = track(() => {

  const editor = useEditor()

  const { color, name } = editor.user.getUserPreferences()

  const[count, setCount]=useState(0)

  const role = useUserRoleStore((state) => state.role)
  const setRole = useUserRoleStore((state) => state.setRole)

  const toggleRole = () => {
    const newRole = role === 'host' ? 'guest' : 'host'
    setRole(newRole)
  }

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const filterShapesByGeo = (geo: 'rectangle' | 'ellipse' | 'triangle' | 'diamond') => {
  const shapes = editor.getCurrentPageShapes()

  const matched = shapes.filter(
    (shape): shape is typeof shape & { props: { geo: string } } =>
      shape.type === 'geo' && 'geo' in shape.props && shape.props.geo === geo
  )

  // 최신 버전에서는 editor.select()를 사용!
  editor.select(...matched.map((s) => s.id))
}

  const selectMyShapes=()=>{
    const userName=editor.user.getUserPreferences().name
    console.log('현재 사용자:', userName)

    const shapes =editor.getCurrentPageShapes()
    console.log('도형 목록:', shapes)

    const mine=shapes.filter(
      (shape)=>
        shape.type ==='geo' &&
        shape.meta?.createdBy ===userName
    )

    console.log('내 도형:', mine)

    editor.select(...mine.map((s)=>s.id))
  }



  useEffect(()=>{
    const cleanup=editor.store.listen(()=>{
      const shapeCount=Object.values(editor.store.allRecords()).filter(
        (r)=>r.typeName==='shape'
      ).length
      setCount(shapeCount)
    })
    return ()=>cleanup()

  },[editor])

  const handleDeleteAll = () => {
    if (role !== 'host') {
      alert('⛔ 게스트는 도형을 삭제할 수 없습니다!')
      return
    }

    const shapeIds = Object.values(editor.store.allRecords())
      .filter((r) => r.typeName === 'shape')
      .map((r) => r.id)

    if (shapeIds.length === 0) {
      alert('❗ 삭제할 도형이 없습니다!')
      return
    }

    if (confirm(`🔴 ${shapeIds.length}개의 도형을 모두 삭제할까요?`)) {
      editor.deleteShapes(shapeIds)
    }
  }

  return (
    <div style={{ pointerEvents: 'all', display: 'flex' }}>
      <p> 현재 도형 수: {count}</p>
      <p>🧑‍💼 현재 역할: {role}</p>
      <p>⏱️ 경과 시간: {elapsed}초</p>


      <div style={{ display: 'flex', gap: '4px' }}>
      <button onClick={handleDeleteAll} style={{ color: 'red' }}>
          🗑 전체 삭제
      </button>
      <button onClick={toggleRole}>🔁 역할 전환</button>
      <button onClick={() => filterShapesByGeo('rectangle')}>⬛ 사각형만 선택</button>
      <button onClick={() => filterShapesByGeo('ellipse')}>⚪ 원만 선택</button>
      <button onClick={selectMyShapes}>🙋 내 도형만 선택</button>


      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            loadPdf(file, editor)
          }
        }}
      />

    </div>
      <input
        type="color"
        value={color}
        onChange={(e) => {
          editor.user.updateUserPreferences({
            color: e.currentTarget.value,
          })
        }}
      />
      <input
        value={name}
        onChange={(e) => {
          editor.user.updateUserPreferences({
            name: e.currentTarget.value,
          })
        }}
      />
    </div>
  )
})
