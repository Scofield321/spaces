// loader.js

// Create the loader element once
const loader = document.createElement("div");
loader.id = "global-loader";
loader.style.cssText = `
  display:none;
  position:fixed;
  top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.5);
  z-index:2000;
  justify-content:center;
  align-items:center;
`;
loader.innerHTML = `
  <div class="spinner" style="
    border: 6px solid #f3f3f3;
    border-top: 6px solid #6366f1;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
  "></div>
`;
document.body.appendChild(loader);

// Spinner keyframes
const style = document.createElement("style");
style.innerHTML = `
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// Export functions to show/hide loader
export const showLoader = () => (loader.style.display = "flex");
export const hideLoader = () => (loader.style.display = "none");
