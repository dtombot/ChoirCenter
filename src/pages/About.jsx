import { useEffect } from 'react';
import '../styles.css'; // Assuming this exists; we'll add styles below

function About() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.about-content p').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-container">
      <h1 className="about-title">About Choir Center</h1>
      <section className="about-content">
        <p>
          Welcome to <strong>Choir Center</strong>, the ultimate platform designed for all choristers, choir leaders, music directors, organists, and keyboardists. Whether you’re a seasoned soprano or a passionate pianist, our mission is to bring you a wealth of resources to elevate your choral experience. From the moment you join us, you’ll discover a vibrant community dedicated to the art of choir music, offering tools and inspiration for every voice and vision.
        </p>
        <p>
          At Choir Center, we’re building a one-stop hub for choir enthusiasts worldwide. Our growing library includes music scripts in both staff and solfa notation, making it easy for choristers of all backgrounds to learn and perform. You’ll find publicly available audio recordings to practice with, and we’re working toward offering studio recording and production services to help bring your choir’s sound to life. Our vision doesn’t stop there—imagine a dedicated choral auditorium for live performances, a music academy for training the next generation of talent, and even accommodation for conventions and visiting choristers. Choir Center aims to be the best source of choir resources on the internet, and we’re just getting started.
        </p>
        <p>
          What sets us apart is our team—a group of music lovers united by a passion for choral growth. We understand the joy of harmonizing voices, the thrill of a perfectly timed hymn, and the community that forms around a shared love of song. Our founders and contributors are choristers, directors, and musicians themselves, committed to preserving and advancing the choral tradition. We’re here to support you with practical tools and a bold vision for the future of choir music.
        </p>
        <p>
          Join us as we grow into a global leader in choral resources. Whether you’re seeking sheet music, training opportunities, or a space to showcase your choir’s talents, Choir Center is your partner in every note. Explore our platform, connect with fellow music enthusiasts, and help us shape the future of choral excellence—one song at a time.
        </p>
      </section>
    </div>
  );
}

export default About;
