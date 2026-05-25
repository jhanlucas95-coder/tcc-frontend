import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const socket = io(API_URL);

function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [usuarioActivo, setUsuarioActivo] = useState(JSON.parse(localStorage.getItem('usuario')) || null);
    const [vista, setVista] = useState(localStorage.getItem('token') ? 'panel' : 'login');

    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [nombreReg, setNombreReg] = useState('');
    const [correoReg, setCorreoReg] = useState('');
    const [contrasenaReg, setContrasenaReg] = useState('');
    const [rolReg, setRolReg] = useState('Coinvestigador');
    const [errorAuth, setErrorAuth] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    const [proyecto, setProyecto] = useState(null);
    const [nuevaTareaTexto, setNuevaTareaTexto] = useState('');
    const [responsableTarea, setResponsableTarea] = useState('');

    const [mensaje, setMensaje] = useState('');
    const [listaMensajes, setListaMensajes] = useState([]);
    const [usuariosSistema, setUsuariosSistema] = useState([]);
    const [chatDestinatario, setChatDestinatario] = useState('Todos');

    const [documentos, setDocumentos] = useState([]);
    const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
    const [tipoDoc, setTipoDoc] = useState('Reporte Parcial');

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const cargarDatosProyecto = () => {
        fetch(`${API_URL}/api/proyecto`, { headers: authHeaders })
            .then(res => res.json())
            .then(data => setProyecto(data))
            .catch(err => console.error("Error cargando el proyecto:", err));
    };

    const cargarHistorialChat = () => {
        fetch(`${API_URL}/api/mensajes`, { headers: authHeaders })
            .then(res => res.json())
            .then(data => setListaMensajes(data))
            .catch(err => console.error("Error cargando mensajes:", err));
    };

    const cargarDocumentos = () => {
        fetch(`${API_URL}/api/documentos`, { headers: authHeaders })
            .then(res => res.json())
            .then(data => setDocumentos(data))
            .catch(err => console.error("Error cargando documentos:", err));
    };

    const cargarUsuariosDelSistema = () => {
        fetch(`${API_URL}/api/usuarios`, { headers: authHeaders })
            .then(res => res.json())
            .then(data => setUsuariosSistema(data))
            .catch(err => console.error("Error cargando usuarios:", err));
    };

    useEffect(() => {
        if (token) {
            cargarDatosProyecto();
            cargarHistorialChat();
            cargarDocumentos();
            cargarUsuariosDelSistema();
        }

        socket.on('recibir_mensaje', (nuevoMsg) => {
            setListaMensajes((prev) => [...prev, nuevoMsg]);
        });
        socket.on('proyecto_actualizado', (data) => {
            setProyecto(data);
        });
        socket.on('documentos_actualizados', (data) => {
            setDocumentos(data);
        });

        return () => {
            socket.off('recibir_mensaje');
            socket.off('proyecto_actualizado');
            socket.off('documentos_actualizados');
        };
    }, [token]);

    const cambiarObjetivo = async () => {
        const nuevoTitulo = prompt("Introduce el nuevo objetivo general del proyecto:", proyecto?.titulo);
        if (nuevoTitulo && nuevoTitulo.trim() !== "") {
            try {
                const res = await fetch(`${API_URL}/api/proyecto/objetivo`, {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({ titulo: nuevoTitulo })
                });
                const data = await res.json();
                if (!res.ok) alert(data.mensaje);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const agregarTarea = async (e) => {
        e.preventDefault();
        if (!nuevaTareaTexto.trim() || !responsableTarea.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/proyecto/tarea`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ nombre: nuevaTareaTexto, responsable: responsableTarea })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.mensaje);
            } else {
                setNuevaTareaTexto('');
                setResponsableTarea('');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const cambiarEstadoTarea = async (id, estadoActual) => {
        const nuevoEstado = estadoActual === 'completada' ? 'pendiente' : 'completada';
        try {
            await fetch(`${API_URL}/api/proyecto/tarea/${id}`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ estado: nuevoEstado })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const eliminarTarea = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar esta actividad?")) {
            try {
                const res = await fetch(`${API_URL}/api/proyecto/tarea/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                const data = await res.json();
                if (!res.ok) alert(data.mensaje);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!archivoSeleccionado) return alert("Por favor, selecciona un archivo.");

        const formData = new FormData();
        formData.append('archivo', archivoSeleccionado);
        formData.append('tipo', tipoDoc);
        formData.append('subidoPor', usuarioActivo?.nombre || "Investigador");

        try {
            const res = await fetch(`${API_URL}/api/documentos/subir`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                setArchivoSeleccionado(null);
                document.getElementById("input-file-tcc").value = "";
                alert("¡Archivo subido exitosamente a la plataforma!");
            } else {
                const data = await res.json();
                alert(data.mensaje);
            }
        } catch (err) {
            console.error("Error al subir archivo:", err);
        }
    };

    const eliminarDocumento = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este documento permanentemente?")) return;
        try {
            const res = await fetch(`${API_URL}/api/documentos/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            const data = await res.json();
            if (!res.ok) alert(data.mensaje); // Bloquea a los Coinvestigadores
        } catch (err) {
            console.error("Error eliminando documento:", err);
        }
    };

    const enviarMensaje = (e) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        const esPrivado = chatDestinatario !== 'Todos';
        const datosMsg = {
            remitente: usuarioActivo?.nombre || 'Anónimo',
            texto: mensaje,
            privado: esPrivado,
            destinatario: chatDestinatario
        };

        socket.emit('enviar_mensaje', datosMsg);
        setMensaje('');
    };

    const manejarLogin = async (e) => {
        e.preventDefault();
        setErrorAuth('');
        try {
            const respuesta = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena })
            });
            const data = await respuesta.json();
            if (respuesta.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                setToken(data.token);
                setUsuarioActivo(data.usuario);
                setVista('panel');
            } else {
                setErrorAuth(data.mensaje || 'Credenciales inválidas');
            }
        } catch (err) {
            setErrorAuth('Error de conexión con el servidor.');
        }
    };

    const manejarRegistro = async (e) => {
        e.preventDefault();
        setErrorAuth('');
        setMensajeExito('');
        try {
            const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombreReg, correo: correoReg, contrasena: contrasenaReg, rol: rolReg })
            });
            const data = await respuesta.json();
            if (respuesta.ok) {
                setMensajeExito('Usuario registrado de manera correcta. ¡Ya puedes iniciar sesión!');
                setNombreReg(''); setCorreoReg(''); setContrasenaReg('');
                setTimeout(() => setVista('login'), 2000);
            } else {
                setErrorAuth(data.mensaje || 'Error al registrar usuario');
            }
        } catch (err) {
            setErrorAuth('Error al comunicarse con el servidor.');
        }
    };

    const cerrarSesion = () => {
        localStorage.clear();
        setToken(null);
        setUsuarioActivo(null);
        setVista('login');
    };

    if (vista === 'login') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'sans-serif' }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: '30px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Iniciar Sesión</h2>
                    {errorAuth && <p style={{ color: 'red', textAlign: 'center' }}>{errorAuth}</p>}
                    <form onSubmit={manejarLogin}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Correo Electrónico:</label>
                            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} style={{ width: '93%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Contraseña:</label>
                            <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} style={{ width: '93%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Ingresar al Sistema</button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
                        ¿No tienes cuenta? <span onClick={() => setVista('registro')} style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>Regístrate aquí</span>
                    </p>
                </div>
            </div>
        );
    }

    if (vista === 'registro') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'sans-serif' }}>
                <div style={{ width: '100%', maxWidth: '420px', padding: '35px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Registro de Investigador</h2>
                    {errorAuth && <p style={{ color: 'red', textAlign: 'center' }}>{errorAuth}</p>}
                    {mensajeExito && <p style={{ color: 'green', textAlign: 'center' }}>{mensajeExito}</p>}
                    <form onSubmit={manejarRegistro}>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nombre Completo:</label>
                            <input type="text" value={nombreReg} onChange={(e) => setNombreReg(e.target.value)} style={{ width: '93%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Correo Institucional:</label>
                            <input type="email" value={correoReg} onChange={(e) => setCorreoReg(e.target.value)} style={{ width: '93%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Contraseña:</label>
                            <input type="password" value={contrasenaReg} onChange={(e) => setContrasenaReg(e.target.value)} style={{ width: '93%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Rol de Investigación:</label>
                            <select value={rolReg} onChange={(e) => setRolReg(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="Coordinador">Coordinador de Investigación</option>
                                <option value="Investigador Principal">Investigador Principal</option>
                                <option value="Coinvestigador">Coinvestigador</option>
                            </select>
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Registrar Cuenta</button>
                    </form>
                    <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
                        ¿Ya tienes cuenta? <span onClick={() => setVista('login')} style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>Inicia Sesión</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#1a202c', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '24px' }}>🧑‍💻</div>
                    <div>
                        <div style={{ fontSize: '14px', color: '#718096' }}>Sesión Iniciada como:</div>
                        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{usuarioActivo?.nombre} <span style={{ fontSize: '12px', fontWeight: 'normal', backgroundColor: '#e2e8f0', padding: '3px 8px', borderRadius: '10px', marginLeft: '5px' }}>{usuarioActivo?.rol}</span></div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={cerrarSesion} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Sistema</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <span style={{ backgroundColor: '#007bff', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px' }}>Proyecto TCC Activo</span>
                            <div style={{ fontSize: '32px', margin: '10px 0 5px 0' }}>📁</div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                                <span style={{ fontWeight: '600', color: '#555' }}>Objetivo:</span>
                                <button onClick={cambiarObjetivo} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }} title="Editar Objetivo">✏️</button>
                            </div>
                            <span style={{ color: '#4a5568', fontSize: '15px', fontStyle: 'italic', display: 'block', fontWeight: '500', padding: '0 10px' }}>
                                "{proyecto?.titulo || 'Cargando objetivo general...'}"
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                            <span style={{ fontWeight: '600' }}>Progreso de Actividades</span>
                            <span style={{ fontWeight: 'bold', color: '#007bff' }}>{proyecto ? proyecto.progreso : 0}%</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: '10px', height: '22px', overflow: 'hidden', marginBottom: '25px' }}>
                            <div style={{ width: `${proyecto ? proyecto.progreso : 0}%`, backgroundColor: proyecto?.progreso === 100 ? '#28a745' : '#007bff', height: '100%', transition: 'width 0.5s ease-in-out' }}></div>
                        </div>

                        <h3 style={{ fontSize: '18px', margin: '0 0 15px 0', borderBottom: '2px solid #edf2f7', paddingBottom: '8px' }}>📋 Cronograma Colaborativo</h3>
                        <form onSubmit={agregarTarea} style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <input type="text" placeholder="Nueva actividad del cronograma..." value={nuevaTareaTexto} onChange={(e) => setNuevaTareaTexto(e.target.value)} style={{ flex: 2, padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '150px' }} required />
                            <input type="text" placeholder="Responsable..." value={responsableTarea} onChange={(e) => setResponsableTarea(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '100px' }} required />
                            <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>➕ Añadir</button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                            {proyecto?.tareas && proyecto.tareas.map((tarea) => (
                                <div key={tarea._id} style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f7fafc' }}>
                                    <input type="checkbox" checked={tarea.estado === 'completada'} onChange={() => cambiarEstadoTarea(tarea._id, tarea.estado)} style={{ width: '18px', height: '18px', marginRight: '15px', cursor: 'pointer' }} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ textDecoration: tarea.estado === 'completada' ? 'line-through' : 'none', color: tarea.estado === 'completada' ? '#a0aec0' : '#2d3748', fontWeight: '500' }}>{tarea.nombre}</span>
                                        <div style={{ color: '#718096', fontSize: '12px', marginTop: '2px' }}>Asignado a: <b>{tarea.responsable}</b></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', backgroundColor: tarea.estado === 'completada' ? '#c6f6d5' : '#feebc8', color: tarea.estado === 'completada' ? '#22543d' : '#744210' }}>{tarea.estado}</span>
                                        <button onClick={() => eliminarTarea(tarea._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Eliminar Actividad">🗑️</button>
                                    </div>
                                </div>
                            ))}
                            {(!proyecto?.tareas || proyecto.tareas.length === 0) && <p style={{ fontSize: '14px', color: '#718096', textAlign: 'center' }}>No hay actividades registradas en el cronograma.</p>}
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '18px', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>📁 Soporte Documental e Informes Parciales</h3>
                        <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e0' }}>
                            <input id="input-file-tcc" type="file" onChange={(e) => setArchivoSeleccionado(e.target.files[0])} style={{ flex: 1 }} required />
                            <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="Encuesta">Encuesta</option>
                                <option value="Reporte Parcial">Reporte Parcial</option>
                                <option value="Entregable Final">Entregable Final</option>
                                <option value="Paper Cientifico">Paper Científico</option>
                            </select>
                            <button type="submit" style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>⬆️ Cargar</button>
                        </form>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                            {documentos.map((doc) => (
                                <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #edf2f7', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ fontSize: '24px' }}>📄</div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2d3748' }}>{doc.nombreOriginal}</div>
                                            <div style={{ fontSize: '11px', color: '#718096' }}>Subido por: {doc.subidoPor}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', backgroundColor: '#edf2f7', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>{doc.tipo}</span>
                                        <a href={`${API_URL}/uploads/${doc.nombreServidor}`} download={doc.nombreOriginal} style={{ backgroundColor: '#007bff', color: 'white', textDecoration: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>📥 Descargar</a>
                                        {/* NUEVO BOTÓN PARA ELIMINAR DOCUMENTO */}
                                        <button onClick={() => eliminarDocumento(doc._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Eliminar Documento">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '640px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '18px', margin: '0 0 15px 0', borderBottom: '2px solid #edf2f7', paddingBottom: '10px' }}>💬 Canal de Comunicación e Historial</h3>
                    <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#edf2f7', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Enviar mensaje a:</span>
                        <select value={chatDestinatario} onChange={(e) => setChatDestinatario(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', flex: 1, fontWeight: '500' }}>
                            <option value="Todos">📢 Todos (Mensaje Público)</option>
                            {usuariosSistema.filter(u => u.nombre !== usuarioActivo?.nombre).map(user => (
                                <option key={user._id} value={user.nombre}>🔒 Privado: {user.nombre} ({user.rol})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#f7fafc', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {listaMensajes
                            .filter(msg => {
                                if (!msg.privado) return true;
                                return msg.remitente === usuarioActivo?.nombre || msg.destinatario === usuarioActivo?.nombre;
                            })
                            .map((msg, index) => {
                                const esMio = msg.remitente === usuarioActivo?.nombre;
                                return (
                                    <div key={msg._id || index} style={{ alignSelf: esMio ? 'flex-end' : 'flex-start', backgroundColor: esMio ? (msg.privado ? '#6b46c1' : '#007bff') : (msg.privado ? '#e9d8fd' : '#e2e8f0'), color: esMio ? 'white' : '#333', padding: '10px 14px', borderRadius: '12px', maxWidth: '75%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: esMio ? '#e2e8f0' : '#4a5568', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                            <span>{msg.remitente}</span>
                                            {msg.privado && <span style={{ fontSize: '9px', backgroundColor: '#cbd5e0', color: '#333', padding: '1px 5px', borderRadius: '4px' }}>🔒 PRIVADO {esMio ? `para ${msg.destinatario}` : ''}</span>}
                                        </div>
                                        <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{msg.texto}</div>
                                        <div style={{ fontSize: '9px', textAlign: 'right', marginTop: '4px', color: esMio ? '#cbd5e0' : '#718096' }}>{msg.fecha}</div>
                                    </div>
                                );
                            })}
                    </div>
                    <form onSubmit={enviarMensaje} style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" placeholder={chatDestinatario === 'Todos' ? "Escribir un mensaje público al equipo..." : `Escribir mensaje privado a ${chatDestinatario}...`} value={mensaje} onChange={(e) => setMensaje(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ backgroundColor: chatDestinatario === 'Todos' ? '#007bff' : '#6b46c1', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Enviar</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default App;