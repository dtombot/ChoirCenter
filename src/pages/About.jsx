import React, { useEffect } from "react";
import styled from "styled-components";
import { Helmet } from "react-helmet";

// Styled components to match limocommand.com/about exactly
const SiteContainer = styled.div`
  position: relative;
  height: 100%;
  overflow-x: auto;
  overflow-y: scroll;
  font-family: Arial, Helvetica, sans-serif;
  margin: 0 auto;
  background: #FFFFFF; /* White background like Wix */
`;

const MasterPage = styled.div`
  display: block; /* Simplified to match Wix’s single-column flow */
  min-height: 100%;
  width: 100%;
  max-width: 980px; /* Matches Wix’s content width */
  margin: 0 auto;
  padding: 0 20px;
`;

const Header = styled.header`
  width: 100%;
  padding: 40px 0 20px;
  text-align: center;
  background: #FFFFFF; /* No colored background */
`;

const PagesContainer = styled.main`
  width: 100%;
  padding: 20px 0;
  background: #FFFFFF;
`;

const Footer = styled.footer`
  width: 100%;
  padding: 20px 0;
  text-align: center;
  background: #FFFFFF;
  color: #333; /* Dark gray text */
  font-size: 0.9rem;
`;

const AboutTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #333; /* Dark gray to match Wix */
  font-weight: bold;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const AboutContent = styled.section`
  font-size: 1rem;
  line-height: 1.6;
  color: #333; /* Dark gray text */
  
  p {
    margin-bottom: 20px;
    opacity: 0;
    transition: opacity 0.6s ease-in-out; /* Retained your animation */
  }

  p.visible {
    opacity: 1;
  }

  strong {
    font-weight: bold;
    color: #333; /* Consistent dark gray */
  }
`;

function About() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".about-content p").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Helmet>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Learn more about Choir Center, your ultimate platform for choir resources." />
        <meta name="format-detection" content="telephone=no" />
        <title>About Choir Center</title>
        <link rel="icon" href="/favicon.ico" /> {/* Update if you have a custom favicon */}
      </Helmet>

      <SiteContainer id="SITE_CONTAINER">
        <MasterPage id="masterPage">
          <Header id="SITE_HEADER">
            <AboutTitle>About Choir Center</AboutTitle>
          </Header>

          <PagesContainer id="PAGES_CONTAINER">
            <AboutContent className="about-content">
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
            </AboutContent>
          </PagesContainer>

          <Footer id="SITE_FOOTER">
            <p>© 2025 Choir Center. All rights reserved.</p>
          </Footer>
        </MasterPage>
      </SiteContainer>
    </>
  );
}

export default About;
