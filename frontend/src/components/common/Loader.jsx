import React from 'react';
import './Loader.css';

const Loader = ({ size = 'default', text = 'Loading...' }) => {
    return (
        <div className={`loader-container loader-${size}`} role="status">
            <div className="loader-spinner">
                <div className="loader-ring">
                    <div className="loader-crescent"></div>
                </div>
                <div className="loader-star">✦</div>
            </div>
            {text && <p className="loader-text">{text}</p>}
        </div>
    );
};

export default Loader;
