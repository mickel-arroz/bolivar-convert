export const ChartSkeleton = () => {
  return (
    <div className="w-full h-87.5 flex flex-col justify-end gap-4 p-2">
       {/* Área del gráfico */}
       <div className="w-full h-full border-b border-l border-muted/50 relative flex items-end justify-around pb-0 px-2">
          {/* Líneas de cuadrícula horizontales */}
          <div className="absolute top-1/4 left-0 w-full h-px bg-muted/20" />
          <div className="absolute top-2/4 left-0 w-full h-px bg-muted/20" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-muted/20" />
          
          <div className="w-full h-full absolute inset-0 flex items-end justify-around px-4">
              {/* Barras animadas simulando datos */}
              <div className="w-8 sm:w-12 h-[40%] bg-muted/50 rounded-t-md animate-pulse"></div>
              <div className="w-8 sm:w-12 h-[60%] bg-muted/50 rounded-t-md animate-pulse"></div>
              <div className="w-8 sm:w-12 h-[30%] bg-muted/50 rounded-t-md animate-pulse"></div>
              <div className="w-8 sm:w-12 h-[80%] bg-muted/50 rounded-t-md animate-pulse"></div>
              <div className="w-8 sm:w-12 h-[50%] bg-muted/50 rounded-t-md animate-pulse"></div>
              <div className="w-8 sm:w-12 h-[90%] bg-muted/50 rounded-t-md animate-pulse"></div>
          </div>
       </div>
       {/* Etiquetas del eje X */}
       <div className="w-full flex justify-around px-2">
         <div className="w-10 h-3 bg-muted/50 rounded animate-pulse"></div>
         <div className="w-10 h-3 bg-muted/50 rounded animate-pulse"></div>
         <div className="w-10 h-3 bg-muted/50 rounded animate-pulse"></div>
         <div className="w-10 h-3 bg-muted/50 rounded animate-pulse"></div>
         <div className="w-10 h-3 bg-muted/50 rounded animate-pulse"></div>
         <div className="w-10 h-3 bg-muted/50 rounded animate-pulse"></div>
       </div>
    </div>
  )
}
