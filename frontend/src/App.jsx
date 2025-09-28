import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import SearchPage from './pages/Searchpage'
import Analytics from './pages/Analytics'

function App() {


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/" element={<Analytics />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
