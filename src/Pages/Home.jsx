import React from 'react';
import { Link } from 'react-router-dom';

export default function Home({ 
    canLogin = true, 
    canRegister = true, 
    user = null, 
    laravelVersion = "10.0", 
    phpVersion = "8.1" 
}) {
    return (
        <>
            <title>Bienvenido a JC Bikes</title>

            <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                {/* Navigation */}
                <nav className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
                                <div className="shrink-0 flex items-center">
                                    <img src="src/images/jcbikes transparente.png" alt="BikeShop Logo" className="h-10 w-auto" />
                                    <span className="ml-3 font-bold text-xl text-gray-800 dark:text-white">JC BIKES</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="hidden md:flex space-x-8 mr-10">
                                    <Link to="/shop" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium">
                                        Tienda
                                    </Link>
                                </div>
                                {canLogin && (
                                    <div className="p-6 text-end">
                                        {user ? (
                                            <Link
                                                to="/dashboard"
                                                className="font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
                                            >Dashboard</Link>
                                        ) : (
                                            <>
                                                <Link
                                                    to="/login"
                                                    className="font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
                                                >Iniciar Sesión</Link>
                                                
                                                {canRegister && (
                                                    <Link
                                                        to="/register"
                                                        className="ms-4 font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
                                                    >Registrarse</Link>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="relative bg-white dark:bg-gray-800 overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="relative z-10 pb-8 bg-white dark:bg-gray-800 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
                            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                                <div className="sm:text-center lg:text-left">
                                    <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                                        <span className="block xl:inline">Tu bicicleta merece</span>
                                        <span className="block text-blue-900 xl:inline"> el mejor servicio</span>
                                    </h1>
                                    <p className="mt-3 text-base text-gray-500 dark:text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                                        Ofrecemos servicios profesionales de reparación y mantenimiento para todo tipo de bicicletas. Desde ajustes básicos hasta reparaciones completas.
                                    </p>
                                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                                        <div className="rounded-md shadow">
                                            <a href="#services" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-900 hover:bg-blue-900 md:py-4 md:text-lg md:px-10">
                                                Ver Servicios
                                            </a>
                                        </div>
                                        <div className="mt-3 sm:mt-0 sm:ml-3">
                                            <Link to="/shop" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10">
                                                Ir a la Tienda
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </main>
                        </div>
                    </div>
                    <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
                        <img className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full" src="https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Bike repair" />
                    </div>
                </div>

                {/* Services Section */}
                <div id="services" className="py-12 bg-gray-100 dark:bg-gray-900">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="lg:text-center">
                            <h2 className="text-base text-blue-900 font-semibold tracking-wide uppercase">Servicios</h2>
                            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                                Lo que hacemos por tu bici
                            </p>
                            <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-300 lg:mx-auto">
                                Contamos con mecánicos expertos y herramientas especializadas.
                            </p>
                        </div>

                        <div className="mt-10">
                            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                                <div className="relative">
                                    <dt>
                                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-900 text-white">
                                            {/* Icon */}
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">Mantenimiento General</p>
                                    </dt>
                                    <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                                        Limpieza, lubricación y ajuste de todos los componentes para que tu bici ruede como nueva.
                                    </dd>
                                </div>

                                <div className="relative">
                                    <dt>
                                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-900 text-white">
                                            {/* Icon */}
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">Reparaciones Express</p>
                                    </dt>
                                    <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                                        Pinchazos, cambios de cables, ajustes de frenos y cambios rápidos para que no pierdas tiempo.
                                    </dd>
                                </div>

                                <div className="relative">
                                    <dt>
                                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-900 text-white">
                                            {/* Icon */}
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                        </div>
                                        <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">Lavado y Engrasado</p>
                                    </dt>
                                    <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                                        Limpieza profunda de transmisión y cuadro, con lubricantes de alta calidad.
                                    </dd>
                                </div>

                                <div className="relative">
                                    <dt>
                                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-900 text-white">
                                            {/* Icon */}
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">Diagnóstico Completo</p>
                                    </dt>
                                    <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                                        Revisión detallada de seguridad y funcionamiento de todos los sistemas de la bicicleta.
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
                        <div className="flex justify-center space-x-6 md:order-2">
                            <span className="text-gray-400 hover:text-gray-500">
                                React Version {laravelVersion && `(Laravel v${laravelVersion}, PHP v${phpVersion})`}
                            </span>
                        </div>
                        <div className="mt-8 md:mt-0 md:order-1">
                            <p className="text-center text-base text-gray-400">
                                &copy; 2025 JCBIKES. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
