document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const downloadButton = document.getElementById('downloadButton');
    const fileList = document.getElementById('fileList');
  
    // Add event listener for file input change
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Handle file upload here
        const formData = new FormData();
        formData.append('file', file);
  
        fetch('/upload', {
          method: 'POST',
          body: formData,
        })
          .then((response) => response.text())
          .then((message) => {
            alert(message);
          });
      }
    });
  
    // Add event listener for upload button click
    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });
  
    // Add event listener for download button click
    downloadButton.addEventListener('click', () => {
      // Replace 'filename.ext' with the actual filename you want to download
      window.location.href = '/download/filename.ext';
    });
  
    // Fetch and display the list of files from the server
    function displayFileList() {
      fetch('/uploads')
        .then((response) => response.json())
        .then((data) => {
          const files = data.map((file) => {
            return `<li>${file}</li>`;
          });
          fileList.innerHTML = `<ul>${files.join('')}</ul>`;
        });
    }
  
    // Initial file list display
    displayFileList();
  });