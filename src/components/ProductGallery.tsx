import React, { useState, useRef } from 'react';
import { Loader2, Upload, Trash2, Star, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface ProductGalleryProps {
  productId: string | null;
  productName: string;
}

interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  created_at: string;
}

export function ProductGallery({ productId, productName }: ProductGalleryProps) {
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar imagens do produto quando o componente for montado
  React.useEffect(() => {
    if (productId) {
      loadProductImages(productId);
    }
  }, [productId]);

  const loadProductImages = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, product_id, url, is_primary, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Garantir o tipo correto dos dados
      const typedData = data as ProductImage[];
      setProductImages(typedData);
    } catch (error: any) {
      console.error('Erro ao carregar imagens do produto:', error.message);
      toast.error('Erro ao carregar imagens do produto');
    }
  };

  const handleImageUpload = async () => {
    if (!productId) {
      toast.error('Salve o produto antes de adicionar imagens');
      return;
    }
    
    if (productImages.length >= 6) {
      toast.error('Limite máximo de 6 imagens atingido');
      return;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !productId) return;
    
    try {
      setUploadingImage(true);
      
      const file = files[0];
      
      // Verificar tamanho do arquivo (limite de 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }
      
      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('O arquivo deve ser uma imagem');
        return;
      }
      
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}_${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;
      
      // Fazer upload para o storage do Supabase
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Obter URL pública da imagem
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Erro ao obter URL da imagem');
      }
      
      // Determinar se esta é a primeira imagem (será a principal)
      const isPrimary = productImages.length === 0;
      
      // Salvar referência no banco de dados
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          url: urlData.publicUrl,
          is_primary: isPrimary
        });
        
      if (dbError) throw dbError;
      
      // Recarregar imagens
      loadProductImages(productId);
      
      toast.success('Imagem adicionada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error.message);
      toast.error('Erro ao enviar imagem: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUploadingImage(false);
      // Limpar input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDeleteImage = async (imageId: string) => {
    if (!productId) return;
    
    try {
      // Verificar se é a imagem principal
      const imageToDelete = productImages.find(img => img.id === imageId);
      
      // Excluir a imagem do banco de dados
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);
        
      if (error) throw error;
      
      // Se era a imagem principal, definir outra como principal
      if (imageToDelete?.is_primary && productImages.length > 1) {
        // Encontrar a próxima imagem que não é a que estamos excluindo
        const nextImage = productImages.find(img => img.id !== imageId);
        
        if (nextImage) {
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ is_primary: true })
            .eq('id', nextImage.id);
            
          if (updateError) throw updateError;
        }
      }
      
      // Recarregar imagens
      loadProductImages(productId);
      
      toast.success('Imagem excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir imagem:', error.message);
      toast.error('Erro ao excluir imagem: ' + (error.message || 'Erro desconhecido'));
    }
  };
  
  const handleSetPrimaryImage = async (imageId: string) => {
    if (!productId) return;
    
    try {
      // Primeiro, remover status de principal de todas as imagens
      const { error: resetError } = await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
        
      if (resetError) throw resetError;
      
      // Depois, definir a imagem selecionada como principal
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);
        
      if (error) throw error;
      
      // Recarregar imagens
      loadProductImages(productId);
      
      toast.success('Imagem principal definida com sucesso!');
    } catch (error: any) {
      console.error('Erro ao definir imagem principal:', error.message);
      toast.error('Erro ao definir imagem principal: ' + (error.message || 'Erro desconhecido'));
    }
  };

  return (
    <div className="space-y-6">
      {!productId ? (
        <div className="bg-slate-700 p-6 rounded-lg text-center">
          <ImageIcon size={48} className="mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-medium text-white mb-2">Salve o produto primeiro</h3>
          <p className="text-slate-400">
            Para adicionar imagens, você precisa primeiro salvar o produto.
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Imagens do Produto</h3>
            <div className="text-sm text-slate-400">
              {productImages.length}/6 imagens
            </div>
          </div>
          
          {productImages.length === 0 ? (
            <div className="bg-slate-700 p-8 rounded-lg text-center">
              <ImageIcon size={48} className="mx-auto mb-4 text-slate-500" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhuma imagem adicionada</h3>
              <p className="text-slate-400 mb-4">
                Adicione até 6 imagens para o seu produto.
              </p>
              <button
                type="button"
                onClick={handleImageUpload}
                disabled={uploadingImage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {uploadingImage ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                <span>Adicionar Imagem</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productImages.map(image => (
                  <div 
                    key={image.id} 
                    className={`relative group rounded-lg overflow-hidden border-2 ${
                      image.is_primary ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img 
                      src={image.url} 
                      alt={`Imagem do produto ${productName}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        {!image.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(image.id)}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full"
                            title="Definir como principal"
                          >
                            <Star size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image.id)}
                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full"
                          title="Excluir imagem"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {image.is_primary && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
                
                {productImages.length < 6 && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex flex-col items-center justify-center gap-2 h-48 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    ) : (
                      <Upload size={24} className="text-slate-400" />
                    )}
                    <span className="text-slate-400 text-sm">Adicionar Imagem</span>
                  </button>
                )}
              </div>
              
              <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">Dicas:</h4>
                <ul className="text-sm text-slate-400 space-y-1 list-disc pl-5">
                  <li>Imagens devem ter no máximo 2MB</li>
                  <li>Formatos aceitos: JPG, PNG, GIF</li>
                  <li>A imagem principal será exibida primeiro no PDV</li>
                  <li>Recomendamos imagens com fundo branco</li>
                </ul>
              </div>
            </>
          )}
          
          {/* Input de arquivo oculto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
