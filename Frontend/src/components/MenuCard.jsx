export default function MenuCard({ item, onOpen }) {
    return (
        <article
            className="menu-card"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(item);
                }
            }}
        >
            <div className="menu-img">
                {item.image ? (
                    <img src={item.image} alt={item.name} loading="lazy" />
                ) : (
                    <div className="menu-img-placeholder">☕</div>
                )}
            </div>
            <div className="menu-info">
                <div className="menu-top">
                    <h3>{item.name}</h3>
                    <span
                        className={`veg-dot ${item.isVeg ? "veg" : "nonveg"}`}
                        title={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
                    />
                </div>
                <p className="menu-desc">{item.description}</p>
                <div className="menu-bottom">
                    <span className="price">₹{item.price}</span>
                    {!item.isAvailable && <span className="sold-out">Sold out</span>}
                </div>
            </div>
        </article>
    );
}