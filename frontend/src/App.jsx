import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import SearchPage from './pages/Searchpage'
import Dashboard from './pages/Dashboard'


function App() {


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
