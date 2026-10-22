import { useState } from 'react'
import './App.css'

function App() {
  const [directory, setDirectory] = useState("")

  const handleDirChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      setDirectory("");
      return
    }

    const relativePath = files[0].webkitRelativePath

    const folderName = relativePath.split("/")[0]

    setDirectory(folderName)
  }

  return (
    <>
      <h1>zipwire</h1>
      <p>Select Directory:</p>
      <input
        type="file"
        {...{ webkitdirectory: '', directory: '', mozdirectory: '' }}
        onChange={handleDirChange}
      />
      <p>Selected Directory: {directory}</p>
    </>
  )
}

export default App
