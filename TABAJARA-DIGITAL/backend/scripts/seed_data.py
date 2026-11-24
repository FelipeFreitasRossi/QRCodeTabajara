"""Dados de EXEMPLO para desenvolvimento e demonstração.

Não é o cardápio oficial do Tabajara: substitua pelo cardápio real pelo painel
administrativo (Etapa 2). Preços em centavos.

"photo" é o número de uma foto ilustrativa do banco de imagens gratuito Pexels
(pexels.com, licença livre para uso comercial). O seed baixa e otimiza a foto.
Troque pelas fotos reais dos pratos assim que possível.
"""

# Foto de capa do cardápio (churrasco na brasa).
HERO_PHOTO = 604660

TABLE_COUNT = 12

# Foto de cada SEÇÃO do cardápio (aparece no canto da seção, com degradê).
# Troque pelas fotos reais no painel (Categorias).
CATEGORY_PHOTOS = {
    "entradas": 2901854,
    "cortes-na-brasa": 8477294,
    "acompanhamentos": 28503584,
    "saladas": 4198024,
    "bebidas": 13059626,
    "sobremesas": 18089587,
}

CATEGORIES = [
    {
        "name": "Entradas",
        "slug": "entradas",
        "description": "Para abrir o apetite enquanto a brasa trabalha.",
        "products": [
            {
                "name": "Pão de alho da casa",
                "photo": 301539,
                "description": "Pão artesanal com manteiga de alho assado e ervas frescas, finalizado na brasa.",
                "price_cents": 2490,
                "ingredients": ["Pão artesanal", "Manteiga", "Alho assado", "Salsinha", "Queijo parmesão"],
                "allergens": ["Glúten", "Lactose"],
            },
            {
                "name": "Linguiça artesanal",
                "photo": 2901854,
                "description": "Linguiça de pernil temperada na casa, servida com vinagrete e farofa.",
                "price_cents": 3890,
                "featured": True,
                "ingredients": ["Pernil suíno", "Alho", "Pimenta-do-reino", "Vinagrete", "Farofa"],
                "allergens": [],
            },
            {
                "name": "Provoleta na brasa",
                "photo": 16594947,
                "description": "Queijo provolone grelhado com orégano, azeite e tomate confitado.",
                "price_cents": 4290,
                "ingredients": ["Provolone", "Orégano", "Azeite", "Tomate confitado"],
                "allergens": ["Lactose"],
            },
            {
                "name": "Bolinho de mandioca com carne seca",
                "description": "Seis unidades, crocantes por fora e cremosos por dentro.",
                "price_cents": 3690,
                "available": False,
                "ingredients": ["Mandioca", "Carne seca", "Queijo coalho", "Cebola"],
                "allergens": ["Lactose", "Glúten"],
            },
        ],
    },
    {
        "name": "Cortes na brasa",
        "slug": "cortes-na-brasa",
        "description": "Cortes selecionados, assados no ponto que você preferir.",
        "products": [
            {
                "name": "Picanha",
                "photo": 8694617,
                "description": "O corte mais tradicional da casa, com capa de gordura e sal grosso. Aprox. 400 g.",
                "price_cents": 12900,
                "featured": True,
                "ingredients": ["Picanha bovina", "Sal grosso"],
                "allergens": [],
            },
            {
                "name": "Bife de chorizo",
                "photo": 299348,
                "description": "Contrafilé alto, suculento e de sabor intenso. Aprox. 350 g.",
                "price_cents": 10900,
                "ingredients": ["Contrafilé bovino", "Sal grosso", "Chimichurri"],
                "allergens": [],
            },
            {
                "name": "Ancho",
                "photo": 1639558,
                "description": "Miolo do acém, marmorizado e macio. Aprox. 350 g.",
                "price_cents": 11400,
                "featured": True,
                "ingredients": ["Ancho bovino", "Sal grosso"],
                "allergens": [],
            },
            {
                "name": "Costela fogo de chão",
                "photo": 8477294,
                "description": "Assada lentamente por 10 horas, desmancha no garfo. Aprox. 500 g.",
                "price_cents": 9800,
                "ingredients": ["Costela bovina", "Sal grosso"],
                "allergens": [],
            },
            {
                "name": "Fraldinha",
                "photo": 4765772,
                "description": "Corte de fibras longas, macio e muito saboroso. Aprox. 400 g.",
                "price_cents": 8900,
                "ingredients": ["Fraldinha bovina", "Sal grosso"],
                "allergens": [],
            },
        ],
    },
    {
        "name": "Acompanhamentos",
        "slug": "acompanhamentos",
        "description": "Para completar a mesa.",
        "products": [
            {
                "name": "Arroz biro-biro",
                "photo": 28503584,
                "description": "Arroz com bacon, ovos, batata palha e cebolinha.",
                "price_cents": 2900,
                "ingredients": ["Arroz", "Bacon", "Ovos", "Batata palha", "Cebolinha"],
                "allergens": ["Ovo"],
            },
            {
                "name": "Farofa da casa",
                "description": "Farinha de mandioca torrada na manteiga com ovos e bacon.",
                "price_cents": 1990,
                "ingredients": ["Farinha de mandioca", "Manteiga", "Ovos", "Bacon"],
                "allergens": ["Lactose", "Ovo"],
            },
            {
                "name": "Mandioca na manteiga",
                "description": "Mandioca cozida e dourada na manteiga de garrafa.",
                "price_cents": 2490,
                "ingredients": ["Mandioca", "Manteiga de garrafa"],
                "allergens": ["Lactose"],
            },
        ],
    },
    {
        "name": "Saladas",
        "slug": "saladas",
        "description": "Leves e frescas.",
        "products": [
            {
                "name": "Salada da horta",
                "photo": 4198024,
                "description": "Folhas verdes, tomate-cereja, palmito e molho de mostarda e mel.",
                "price_cents": 3290,
                "ingredients": ["Mix de folhas", "Tomate-cereja", "Palmito", "Mostarda", "Mel"],
                "allergens": ["Mostarda"],
            },
            {
                "name": "Caprese",
                "photo": 144239,
                "description": "Tomate, muçarela de búfala, manjericão e redução de balsâmico.",
                "price_cents": 3890,
                "ingredients": ["Tomate", "Muçarela de búfala", "Manjericão", "Aceto balsâmico"],
                "allergens": ["Lactose"],
            },
        ],
    },
    {
        "name": "Bebidas",
        "slug": "bebidas",
        "description": "Drinks, refrigerantes e sucos.",
        "products": [
            {
                "name": "Caipirinha de limão",
                "photo": 13059626,
                "description": "Cachaça artesanal, limão-taiti e açúcar.",
                "price_cents": 2600,
                "featured": True,
                "ingredients": ["Cachaça", "Limão-taiti", "Açúcar", "Gelo"],
                "allergens": [],
            },
            {
                "name": "Suco natural",
                "photo": 5511227,
                "description": "Laranja, limão, abacaxi com hortelã ou maracujá. 400 ml.",
                "price_cents": 1400,
                "ingredients": ["Fruta da estação", "Água", "Gelo"],
                "allergens": [],
            },
            {
                "name": "Refrigerante lata",
                "photo": 8879621,
                "description": "350 ml. Consulte os sabores disponíveis.",
                "price_cents": 790,
                "ingredients": [],
                "allergens": [],
            },
            {
                "name": "Água mineral",
                "photo": 4667185,
                "description": "Com ou sem gás. 500 ml.",
                "price_cents": 590,
                "ingredients": [],
                "allergens": [],
            },
        ],
    },
    {
        "name": "Sobremesas",
        "slug": "sobremesas",
        "description": "Um final à altura.",
        "products": [
            {
                "name": "Pudim de leite",
                "photo": 18089587,
                "description": "Receita tradicional, cremoso e com calda de caramelo.",
                "price_cents": 1890,
                "ingredients": ["Leite condensado", "Leite", "Ovos", "Açúcar"],
                "allergens": ["Lactose", "Ovo"],
            },
            {
                "name": "Abacaxi na brasa",
                "photo": 36687258,
                "description": "Com canela e sorvete de creme.",
                "price_cents": 2290,
                "ingredients": ["Abacaxi", "Canela", "Açúcar", "Sorvete de creme"],
                "allergens": ["Lactose"],
            },
        ],
    },
]
