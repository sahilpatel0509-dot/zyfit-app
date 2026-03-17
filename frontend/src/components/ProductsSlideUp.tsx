import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DbProduct {
  id: string;
  reel_id: string;
  product_name: string;
  affiliate_link: string;
}

interface ProductsSlideUpProps {
  isOpen: boolean;
  onClose: () => void;
  reelId?: string;
}

const ProductsSlideUp = ({ isOpen, onClose, reelId }: ProductsSlideUpProps) => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!reelId) return;
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("reel_products")
      .select("id, reel_id, product_name, affiliate_link")
      .eq("reel_id", reelId);
      
    if (error || !rows || rows.length === 0) {
      setProducts([]);
    } else {
      setProducts(rows as DbProduct[]);
    }
    setLoading(false);
  }, [reelId]);

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen, fetchProducts]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] max-h-[70vh] rounded-t-3xl bg-card border-t border-border/50 flex flex-col"
          >
            {/* Handle */}
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border/50">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Products <span className="text-muted-foreground font-body text-sm font-normal">({products.length})</span>
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">No products added for this reel.</p>
                </div>
              ) : (
                <div className="space-y-3 pb-6">
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/50 border border-border/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4 text-primary" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {product.product_name}
                          </p>
                        </div>
                      </div>
                      <a
                        href={product.affiliate_link.startsWith('http') ? product.affiliate_link : `https://${product.affiliate_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 shadow-sm"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductsSlideUp;
