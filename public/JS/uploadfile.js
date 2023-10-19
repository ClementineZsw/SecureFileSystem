/*----------------------------------------------------
[ 文件上传 ]
 */

var upload = {
    pageName: '',
    bytesPerChunk: 20 * 1024 * 1024,
    uploaded: 0,
    total: 0,
    file: null,
    fileName: '',

    sendFile: function () {
        if (upload.uploaded >= upload.total) {
            return;
        }
        var end = upload.uploaded + upload.bytesPerChunk;
        if (end > upload.total) {
            end = upload.total;
        }

        var blob = upload.file.slice(upload.uploaded, end);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', upload.pageName, false);  // async如果值为false，send()方法直到收到答复前不会返回。
        xhr.setRequestHeader("Content-Type", "multipart/form-data");
        xhr.setRequestHeader("X-File-Name", upload.fileName);
        xhr.setRequestHeader("X-File-Type", upload.file.type);
        xhr.send(blob);

        upload.uploaded += upload.bytesPerChunk;

        // setTimeout(upload.updateProgress, 100);
        xhr.upload.addEventListener("progress", function (evt) {
            if (evt.lengthComputable) {
                let progress = Math.ceil(((upload.uploaded) / upload.total) * 100);
                $("#progressPercent").html(progress + "%");
                $('#progressBar').value = progress;
            }
        }, false);
        setTimeout(upload.sendFile, 100);
    },

    upload: function (file) {
        upload.file = file;
        upload.total = file.size;
        upload.fileName = file.name;

        setTimeout(upload.sendFile(), 100);

        return upload.fileName;
    }
};