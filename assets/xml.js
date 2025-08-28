function readFileTextSmart(file){
  if(!(file && file.arrayBuffer)){
    return Promise.reject(new Error('No file or File API not available'))
  }
  return file.arrayBuffer().then(buf=>{
    const bytes=new Uint8Array(buf)
    
    // UTF-16LE/BE BOM detection
    if(bytes.length>=2){
      const b0=bytes[0], b1=bytes[1]
      
      // UTF-16LE BOM FF FE
      if(b0===0xFF && b1===0xFE){
        let s=''
        for(let i=2;i+1<bytes.length;i+=2){ s+=String.fromCharCode(bytes[i] | (bytes[i+1]<<8)) }
        // Исправляем проблему с пробелами между символами в UTF-16
        s = s.replace(/\s+/g, ' ').replace(/\s*<\s*/g, '<').replace(/\s*>\s*/g, '>').replace(/\s*\/\s*/g, '/');
        return s
      }
      
      // UTF-16BE BOM FE FF  
      if(b0===0xFE && b1===0xFF){
        let s=''
        for(let i=2;i+1<bytes.length;i+=2){ s+=String.fromCharCode((bytes[i]<<8) | bytes[i+1]) }
        // Исправляем проблему с пробелами между символами в UTF-16
        s = s.replace(/\s+/g, ' ').replace(/\s*<\s*/g, '<').replace(/\s*>\s*/g, '>').replace(/\s*\/\s*/g, '/');
        return s
      }
    }
    
    // Fallback to TextDecoder (utf-8)
    let text;
    try{ 
      text = new TextDecoder('utf-8').decode(bytes);
    } catch { 
      text = new TextDecoder().decode(bytes);
    }
    
    // Проверяем на проблему с разделенными пробелами символами и исправляем
    if (text.includes('< ') || text.includes(' >')) {
      text = text.replace(/\s*<\s*/g, '<')
                 .replace(/\s*>\s*/g, '>')
                 .replace(/\s*\/\s*/g, '/')
                 .replace(/\s+/g, ' ')
                 .trim();
    }
    
    return text;
  })
}

