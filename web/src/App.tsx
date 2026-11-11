import './App.css'

function App() {
  let roomID: string = location.hash.slice(1);

  if (roomID === "") {

    // No fragment - this browser is host
    let roomID: string = crypto.randomUUID();
    const socket = new WebSocket(`wss://localhost:8000/${roomID}`)

  } else {
    
  }

  return (
    <>
      <h1>zipwire</h1>
    </>
  )
}

export default App
