export const sourceExample = {
  project: 'Proyecto Omega',
  question: '¿Qué proveedor elegimos?',
  answer: 'El equipo eligió al proveedor B para avanzar con el proyecto.',
  speaker: 'Santiago',
  time: '01:38',
  quote: 'Entonces vamos a seleccionar el proveedor B.',
} as const

export const questions = [
  {
    question: '¿Qué es KnowHub?',
    answer: 'Es un espacio para reunir documentos, notas y reuniones. Te ayuda a organizar esa información, hacer preguntas sobre ella y volver a las fuentes para revisar el contexto.',
  },
  {
    question: '¿Para quién lo estamos creando?',
    answer: 'Para personas que trabajan y aprenden con mucha información: estudiantes, profesionales y equipos que quieren conservar el contexto de sus proyectos, clases y reuniones.',
  },
  {
    question: '¿La demo usa mis datos o una IA en vivo?',
    answer: 'No. Es un ejemplo interactivo con contenido ficticio del Proyecto Omega. No carga documentos, no graba audio y no envía preguntas a una IA. Muestra el recorrido que podrás encontrar en la aplicación.',
  },
  {
    question: '¿Cómo funcionan las reuniones y las fuentes?',
    answer: 'La app permite grabar o subir audio e importar transcripciones. La transcripción de audio requiere un proveedor configurado. Las citas te permiten revisar los fragmentos originales; las respuestas de IA pueden contener errores y conviene contrastarlas.',
  },
  {
    question: '¿Cuándo podré usarlo?',
    answer: 'KnowHub está en etapa de prelanzamiento. Todavía no hay una fecha de apertura ni planes anunciados. Por ahora, puedes conocer la propuesta y recorrer esta demo sin crear una cuenta.',
  },
] as const
