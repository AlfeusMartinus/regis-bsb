import React from 'react';
import { clsx } from 'clsx';

interface StepperProps {
    currentStep: number;
    steps: string[];
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, steps }) => {
    return (
        <div className="w-[75%] md:w-full max-w-lg mx-auto mb-8">
            <div className="flex items-center justify-between relative">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <React.Fragment key={index}>
                            {/* Step Circle & Label Container */}
                            <div className="flex flex-col items-center relative z-10">
                                <div
                                    className={clsx(
                                        "flex items-center justify-center w-10 h-10 rounded-full border-2 text-base font-bold transition-all duration-300",
                                        isActive || isCompleted
                                            ? "border-primary bg-primary text-[#111814] shadow-[0_0_0_4px_rgba(19,236,109,0.2)]"
                                            : "border-gray-200 bg-white text-gray-300"
                                    )}
                                >
                                    {isCompleted ? (
                                        <span className="material-symbols-outlined text-lg font-bold">check</span>
                                    ) : (
                                        stepNumber
                                    )}
                                </div>
                                <div className="absolute -bottom-8 w-32 text-center">
                                    <span
                                        className={clsx(
                                            "text-xs font-semibold block transition-colors duration-300",
                                            isActive ? "text-[#111814]" : isCompleted ? "text-slate-600" : "text-gray-300"
                                        )}
                                    >
                                        {step}
                                    </span>
                                </div>
                            </div>

                            {/* Connector Line (Only if not the last item) */}
                            {!isLast && (
                                <div className="flex-1 h-[2px] mx-2 bg-gray-100 relative">
                                    <div
                                        className={clsx(
                                            "absolute inset-0 bg-primary transition-all duration-500 ease-out",
                                            isCompleted ? "w-full" : "w-0"
                                        )}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            {/* Spacer for labels */}
            <div className="h-6"></div>
        </div>
    );
};
