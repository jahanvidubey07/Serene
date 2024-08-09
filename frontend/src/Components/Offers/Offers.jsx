import React from 'react'
import './Offers.css'
import bannerImage from '../Assets/exclusive.jpg'

export const Offers = () => {
  return (
    <div className="offers" style={{ backgroundImage: `url(${bannerImage})` }}>
    <div className="offers-left">
        <h1>Exclusive Offer</h1>
        <p>Get the best deals on our products now!</p>
        <button>Check Now</button>
    </div>
</div>
  )
}
