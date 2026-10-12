/** Tema de Libitina EPS: escalas de azul y dorado derivadas del logo */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        azul: {
          50: '#EEF4FA', 100: '#D8E6F2', 200: '#A9C4D7', 300: '#7FA8CA', 400: '#598EBA',
          500: '#2F70A8', 600: '#075699', 700: '#064A85', 800: '#053C6B', 900: '#042F54', 950: '#021C33',
        },
        dorado: {
          50: '#FEF9E8', 100: '#FDF0C4', 200: '#FADD7F', 300: '#F8CF4E', 400: '#F6C220',
          500: '#DDA90F', 600: '#B8890B', 700: '#8F690C', 800: '#6B4F0E', 900: '#4A370C',
        },
        marca: '#003366',
        fondo: '#F7FAFD',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { sitio: '1240px' },
    },
  },
  plugins: [],
};
