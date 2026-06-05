import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import NetworkMesh from './NetworkMesh';

export const CTASection = () => {
  return (
    <section id="cta" className="relative py-28 lg:py-36 bg-[#030712] text-white overflow-hidden">
      <NetworkMesh variant="dark" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight">
            Let Lucy Handle the Complexity.
          </h2>
          <p className="text-xl text-slate-400 max-w-md mx-auto leading-relaxed">
            Talk naturally.
            <br />
            Trade confidently.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link to="/auth/signup">
              <Button variant="primary" size="lg" className="!px-8 !rounded-lg">
                Start Trading Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/app/dashboard">
              <Button
                variant="secondary"
                size="lg"
                className="!bg-transparent !text-white !border-white/25 hover:!bg-white/5 !rounded-lg"
              >
                Book Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
