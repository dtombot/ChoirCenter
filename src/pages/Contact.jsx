import { useState } from 'react';
import '../styles.css';

function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending...');

    // Simulate form submission (replace with actual API call if needed)
    try {
      // Example: await fetch('/api/contact', { method: 'POST', body: JSON.stringify(formData) });
      setTimeout(() => {
        setStatus('Message sent successfully!');
        setFormData({ name: '', email: '', message: '' });
      }, 1000);
    } catch (error) {
      setStatus('Failed to send message. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="contact-container">
      <h1 className="contact-title">Contact Us</h1>
      <section className="contact-content">
        <div className="contact-info">
          <div className="contact-item">
            <span className="contact-label">Email:</span>
            <a href="mailto:admin@choircenter.com" className="contact-link">admin@choircenter.com</a>
          </div>
          <div className="contact-item">
            <span className="contact-label">Phone:</span>
            <a href="tel:+2349150196438" className="contact-link">+234 915 019 6438</a>
          </div>
          <div className="contact-item">
            <span className="contact-label">Address:</span>
            <p className="contact-text">No. 6d, Azi Nyako Youth Center, Dadin Kowa, Jos, Plateau State</p>
          </div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="contact-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="contact-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Your Message"
              className="contact-textarea"
              rows="5"
              required
            ></textarea>
          </div>
          <button type="submit" className="contact-submit">Send Message</button>
          {status && <p className={status.includes('success') ? 'success-message' : 'error-message'}>{status}</p>}
        </form>
      </section>
    </div>
  );
}

export default Contact;
