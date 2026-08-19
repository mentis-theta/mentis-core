import React, { useEffect, useRef } from 'react';

const NeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        // Constants
        const waveCount = 45; // Número total de fios
        const waves: Wave[] = [];

        // Função de easing: Cubic Out (desaceleração suave)
        const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);

        // Paleta baseada em Roxo/Violeta com toques de Teal e muita transparência
        const colors = [
            'rgba(124, 58, 237, 0.45)', // Violeta - Mais intenso
            'rgba(167, 139, 250, 0.35)', // Violeta Claro
            'rgba(124, 58, 237, 0.6)',   // Violeta Intenso
            'rgba(167, 139, 250, 0.4)',
            'rgba(16, 185, 129, 0.25)',  // Subtle Emerald
        ];

        class Wave {
            baseX: number;
            amplitude: number;
            frequency: number;
            speed: number;
            color: string;
            lineWidth: number;
            timeOffset: number;
            organicVariance: number;
            // Novas propriedades para animação inicial
            delay: number;
            growthSpeed: number;
            // Otimização: Cor pré-parseada
            baseRGB: string;
            maxAlpha: number;

            constructor(width: number, isLeft: boolean) {
                if (isLeft) {
                    this.baseX = (width * 0.1) + Math.random() * (width * 0.15);
                } else {
                    this.baseX = (width * 0.75) + Math.random() * (width * 0.15);
                }

                this.amplitude = Math.random() * 60 + 30;
                this.frequency = (Math.random() * 0.002) + 0.001;
                this.speed = (Math.random() * 0.001) + 0.0005;
                const fullColor = colors[Math.floor(Math.random() * colors.length)];
                this.color = fullColor;
                this.lineWidth = Math.random() * 1.5 + 0.5;
                this.timeOffset = Math.random() * Math.PI * 2;
                this.organicVariance = Math.random() * 0.005;

                // Variância orgânica para o surgimento
                this.delay = Math.random() * 40; // Atraso aleatório em frames
                this.growthSpeed = 0.006 + Math.random() * 0.004; // Velocidades variadas

                // Otimização de Performance: Pré-parsear a cor
                this.baseRGB = fullColor.substring(0, fullColor.lastIndexOf(',') + 1);
                this.maxAlpha = parseFloat(fullColor.split(',').pop() || '0.5');
            }
        }

        // Popular os 2 lados
        for (let i = 0; i < waveCount; i++) {
            waves.push(new Wave(width, i % 2 === 0));
        }

        let animationFrameId: number;
        let time = 0;
        let frameCount = 0;

        const animate = () => {
            time += 1.5;
            frameCount++;

            // Clear screen with transparency
            (ctx as CanvasRenderingContext2D).clearRect(0, 0, width, height);

            for (let i = 0; i < waves.length; i++) {
                const wave = waves[i];

                // Progresso individual por fio
                const rawProgress = Math.max(0, (frameCount - wave.delay) * wave.growthSpeed);
                const progress = cubicOut(Math.min(1, rawProgress));

                if (progress <= 0) continue;

                ctx.beginPath();

                // Transparência baseada no progresso (Otimizado)
                ctx.strokeStyle = `${wave.baseRGB} ${wave.maxAlpha * progress})`;

                ctx.lineWidth = wave.lineWidth;

                let startX = wave.baseX + Math.sin(height * wave.frequency + time * wave.speed + wave.timeOffset) * wave.amplitude;
                ctx.moveTo(startX, height);

                const targetY = height - (height * progress);

                for (let y = height; y >= targetY; y -= 15) {
                    const dynamicAmplitude = wave.amplitude + Math.sin(y * wave.organicVariance + time * 0.0005) * 15;
                    const x = wave.baseX + Math.sin(y * wave.frequency + time * wave.speed + wave.timeOffset) * dynamicAmplitude;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
    );
};

export default NeuralBackground;
