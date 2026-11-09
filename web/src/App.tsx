import './App.css'
import { create, getSocket } from "../../server/src/server"
import type { ServerMessage } from '../../shared/protocol';

function App() {
  let roomID: string = location.hash.slice(1);

  if (roomID === "") {

    // No fragment - this browser is host
    let roomID: string = crypto.randomUUID.toString();
    const socket = new WebSocket(`wss://localhost:8000/${roomID}`)

    let msg: ServerMessage = create(roomID, socket);
  } else {
    // Has fragment - this browser is receiver
    let ws: WebSocket | ServerMessage = getSocket(roomID);

    // check if ws is a WebSocket or a ServerMessage
    if()
  }

  return (
    <>
      <h1>zipwire</h1>
    </>
  )
}

export default App
