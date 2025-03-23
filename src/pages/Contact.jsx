import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

function Contact({ recaptchaLoaded }) {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const renderRecaptcha = () => {
      console.log('reCAPTCHA render check:', {
        recaptchaLoaded,
        grecaptchaExists: !!window.grecaptcha,
        renderExists: window.grecaptcha && !!window.grecaptcha.render,
        refExists: !!recaptchaRef.current,
      });

      if (!recaptchaLoaded || !window.grecaptcha || !recaptchaRef.current) {
        console.log('reCAPTCHA not ready yet');
        return;
      }

      const attemptRender = () => {
        if (window.grecaptcha && window.grecaptcha.render) {
          try {
            window.grecaptcha.render(recaptchaRef.current, {
              sitekey: '6LczEuYqAAAAANYh6VG8jSj1Fmt6LKMK7Ee1OcfU',
              callback: (token) => console.log('reCAPTCHA token received:', token),
            });
            console.log('reCAPTCHA rendered successfully');
          } catch (err) {
            console.error('Error rendering reCAPTCHA:', err);
            setStatus('Failed to load reCAPTCHA. Please refresh the page.');
          }
        } else {
          console.log('reCAPTCHA render not available yet, retrying...');
          setTimeout(attemptRender, 100); // Retry every 100ms
        }
      };

      attemptRender();
    };

    renderRecaptcha();
  }, [recaptchaLoaded]);

  const verifyRecaptcha = async (token) => {
    try {
      const response = await fetch('/.netlify/functions/verify-recaptcha', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      console.log('reCAPTCHA verification result:', result);
      return result.success;
    } catch (err) {
      console.error('reCAPTCHA verification error:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);

    if (!recaptchaLoaded || !window.grecaptcha) {
      setStatus('reCAPTCHA not loaded. Please wait or refresh.');
      setLoading(false);
      return;
    }

    const token = window.grecaptcha.getResponse();
    console.log('Token retrieved on submit:', token);
    if (!token) {
      setStatus('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    const isRecaptchaValid = await verifyRecaptcha(token);
    if (!isRecaptchaValid) {
      setStatus('reCAPTCHA verification failed. Try again.');
      setLoading(false);
      window.grecaptcha.reset();
      return;
    }

    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: formData.name,
        email: formData.email,
        message: formData.message,
      });
      if (error) throw error;

      setStatus('Message sent successfully!');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus('Failed to send message: ' + error.message);
    } finally {
      setLoading(false);
      if (window.grecaptcha) window.grecaptcha.reset();
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '500px',
          transform: 'translateY(0)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          ':hover': { transform: 'translateY(-5px)', boxShadow: '0 15px 40px rgba(0, 0, 0, 0.15)' },
        }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: '20px' }}>Get in Touch</h1>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your Name"
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              ':focus': { borderColor: '#98fb98' },
            }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Your Email"
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              ':focus': { borderColor: '#98fb98' },
            }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Your Message"
            required
            disabled={loading}
            rows="5"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
              resize: 'vertical',
              transition: 'border-color 0.3s ease',
              ':focus': { borderColor: '#98fb98' },
            }}
          ></textarea>
        </div>
        <div ref={recaptchaRef} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}></div>
        {!recaptchaLoaded && <p style={{ textAlign: 'center', color: '#666' }}>Loading reCAPTCHA...</p>}
        <button
          type="submit"
          disabled={loading || !recaptchaLoaded}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#fff',
            background: loading ? '#ccc' : '#98fb98',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !recaptchaLoaded ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
            ':hover': loading || !recaptchaLoaded ? {} : { background: '#85e885' },
          }}
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
        {status && (
          <p
            style={{
              marginTop: '15px',
              textAlign: 'center',
              color: status.includes('success') ? '#28a745' : '#dc3545',
              fontWeight: '500',
            }}
          >
            {status}
          </p>
        )}
      </form>
    </div>
  );
}

export default Contact;
